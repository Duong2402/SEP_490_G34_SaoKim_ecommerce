using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using System.Collections.Generic;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/staff/orders")]
    [AllowAnonymous] // tạm thời; sau này dùng [Authorize(Roles="staff,admin,...")]
    public class StaffOrdersController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        private readonly ILogger<StaffOrdersController> _logger;
        private readonly IDispatchService _dispathservice;

        public StaffOrdersController(
            SaoKimDBContext db,
            ILogger<StaffOrdersController> logger,
            IDispatchService dispathservice)
        {
            _db = db;
            _logger = logger;
            _dispathservice = dispathservice;
        }

        public class UpdateOrderStatusRequest
        {
            public string Status { get; set; } = string.Empty;
        }

        // =========================================================
        // 1) LIST ORDERS CHO STAFF
        // GET /api/staff/orders
        // =========================================================
        [HttpGet]
        public async Task<IActionResult> GetList(
            [FromQuery] string? q = null,
            [FromQuery] string? status = null,
            [FromQuery] DateTime? createdFrom = null,
            [FromQuery] DateTime? createdTo = null,
            [FromQuery] string sortBy = "created",
            [FromQuery] string sortDir = "desc",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 200) pageSize = 10;

            var baseQuery = _db.Orders
                .AsNoTracking()
                .Include(o => o.Customer)
                .Include(o => o.Invoice)
                .Where(o => o.Customer.DeletedAt == null);

            // Search theo id / tên KH / email / phone
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                baseQuery = baseQuery.Where(o =>
                    o.OrderId.ToString().Contains(term) ||
                    (o.Customer.Name != null && o.Customer.Name.ToLower().Contains(term)) ||
                    (o.Customer.Email != null && o.Customer.Email.ToLower().Contains(term)) ||
                    (o.Customer.PhoneNumber != null && o.Customer.PhoneNumber.ToLower().Contains(term)));
            }

            // Filter status
            if (!string.IsNullOrWhiteSpace(status))
            {
                var st = status.Trim().ToLower();
                baseQuery = baseQuery.Where(o => o.Status.ToLower() == st);
            }

            // Filter createdFrom / createdTo
            if (createdFrom.HasValue)
                baseQuery = baseQuery.Where(o => o.CreatedAt >= createdFrom.Value);

            if (createdTo.HasValue)
                baseQuery = baseQuery.Where(o => o.CreatedAt < createdTo.Value);

            // Sort
            var desc = sortDir.Equals("desc", StringComparison.OrdinalIgnoreCase);
            baseQuery = (sortBy ?? "").ToLower() switch
            {
                "total" => desc
                    ? baseQuery.OrderByDescending(o => o.Total)
                    : baseQuery.OrderBy(o => o.Total),

                "status" => desc
                    ? baseQuery.OrderByDescending(o => o.Status)
                    : baseQuery.OrderBy(o => o.Status),

                "customer" => desc
                    ? baseQuery.OrderByDescending(o => o.Customer.Name)
                    : baseQuery.OrderBy(o => o.Customer.Name),

                "created" or _ => desc
                    ? baseQuery.OrderByDescending(o => o.CreatedAt)
                    : baseQuery.OrderBy(o => o.CreatedAt),
            };

            var total = await baseQuery.CountAsync();

            var orders = await baseQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new
                {
                    o.OrderId,
                    ReferenceNo = $"ORD-{o.OrderId}",
                    CustomerName = o.Customer.Name,
                    CustomerEmail = o.Customer.Email,
                    CustomerPhone = o.Customer.PhoneNumber,
                    o.Total,
                    o.Status,
                    o.CreatedAt,
                    o.PaymentMethod,              // thêm
                    HasInvoice = o.Invoice != null,
                    InvoiceId = o.Invoice != null ? (int?)o.Invoice.Id : null
                })
                .ToListAsync();

            var referenceNos = orders.Select(o => o.ReferenceNo).ToList();
            var confirmedRefs = referenceNos.Count == 0
                ? new HashSet<string>()
                : new HashSet<string>(await _db.Dispatches
                    .AsNoTracking()
                    .Where(d => referenceNos.Contains(d.ReferenceNo) && d.ConfirmedAt != null)
                    .Select(d => d.ReferenceNo)
                    .ToListAsync());

            var items = orders.Select(o => new
            {
                id = o.OrderId,
                code = o.ReferenceNo,
                customerName = o.CustomerName,
                customerEmail = o.CustomerEmail,
                customerPhone = o.CustomerPhone,
                total = o.Total,
                status = o.Status,
                createdAt = o.CreatedAt,
                paymentMethod = o.PaymentMethod,   // cho FE staff dùng
                hasInvoice = o.HasInvoice,
                invoiceId = o.InvoiceId,
                dispatchConfirmed = confirmedRefs.Contains(o.ReferenceNo)
            });

            return Ok(new
            {
                items,
                page,
                pageSize,
                total,
                totalPages = (int)Math.Ceiling(total / (double)pageSize)
            });
        }

        // =========================================================
        // 2) ORDER DETAIL CHO STAFF
        // GET /api/staff/orders/{id}
        // =========================================================
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var order = await _db.Orders
                .AsNoTracking()
                .Include(o => o.Customer)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Product)
                .Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null) return NotFound();

            var dto = new
            {
                id = order.OrderId,
                code = $"ORD-{order.OrderId}",
                total = order.Total,
                status = order.Status,
                paymentMethod = order.PaymentMethod,   // thêm cho rõ loại thanh toán
                createdAt = order.CreatedAt,

                customerId = order.UserId,
                customerName = order.Customer?.Name,
                customerEmail = order.Customer?.Email,
                customerPhone = order.Customer?.PhoneNumber,

                invoice = order.Invoice == null
                    ? null
                    : new
                    {
                        order.Invoice.Id,
                        order.Invoice.Code,
                        order.Invoice.Total,
                        status = order.Invoice.Status.ToString(),
                        createdAt = order.Invoice.CreatedAt
                    },

                items = order.Items.Select(i => new
                {
                    i.OrderItemId,
                    i.ProductId,
                    productName = i.Product.ProductName,
                    productCode = i.Product.ProductCode,
                    i.Quantity,
                    i.UnitPrice,
                    lineTotal = i.UnitPrice * i.Quantity
                })
            };

            return Ok(dto);
        }

        // =========================================================
        // 3) UPDATE STATUS + AUTO CREATE INVOICE
        // =========================================================
        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusRequest req)
        {
            var rawStatus = (req.Status ?? "").Trim();

            if (string.IsNullOrWhiteSpace(rawStatus))
                return BadRequest(new { message = "Status is required" });

            // Chuẩn hóa text hiển thị tiếng Việt -> status nội bộ
            string NormalizeStatus(string s)
            {
                if (string.Equals(s, "Hoàn tất", StringComparison.OrdinalIgnoreCase))
                    return "Completed";
                if (string.Equals(s, "Chờ xử lý", StringComparison.OrdinalIgnoreCase))
                    return "Pending";
                if (string.Equals(s, "Đang giao", StringComparison.OrdinalIgnoreCase))
                    return "Shipping";
                if (string.Equals(s, "Đã hủy", StringComparison.OrdinalIgnoreCase))
                    return "Cancelled";
                if (string.Equals(s, "Đã thanh toán", StringComparison.OrdinalIgnoreCase))
                    return "Paid";

                return s;
            }

            var newStatus = NormalizeStatus(rawStatus);

            var allowedStatuses = new[]
            {
                "Pending",
                "Shipping",
                "Paid",
                "Completed",
                "Cancelled"
            };

            if (!allowedStatuses.Contains(newStatus, StringComparer.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = $"Invalid status: {rawStatus}" });
            }

            bool IsCompleted(string status)
                => string.Equals(status, "Completed", StringComparison.OrdinalIgnoreCase);

            bool IsPaid(string status)
                => string.Equals(status, "Paid", StringComparison.OrdinalIgnoreCase);

            var order = await _db.Orders
                .Include(o => o.Customer)
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null) return NotFound();

            // Xác định loại thanh toán
            // PaymentMethod: "QR" / "COD"
            var paymentMethod = (order.PaymentMethod ?? "").Trim().ToUpperInvariant();
            var isCod = paymentMethod == "COD";
            var isQr = paymentMethod == "QR";

            // Đơn QR không cho set sang Paid (đã trả trước)
            if (isQr && IsPaid(newStatus))
            {
                return BadRequest(new { message = "Đơn thanh toán QR không có bước 'Đã thanh toán' riêng." });
            }

            // Đơn COD: không cho nhảy thẳng sang Completed nếu chưa Paid
            if (isCod && IsCompleted(newStatus) && !IsPaid(order.Status))
            {
                return BadRequest(new { message = "Đơn COD phải chuyển sang 'Đã thanh toán' trước khi hoàn tất." });
            }

            // =====================================================
            // BẮT BUỘC KHO PHẢI XÁC NHẬN PHIẾU XUẤT TRƯỚC
            // KHI STAFF ĐƯỢC PHÉP ĐỔI TRẠNG THÁI (TRỪ KHI HỦY ĐƠN)
            // =====================================================
            var isCancelling = string.Equals(newStatus, "Cancelled", StringComparison.OrdinalIgnoreCase);

            if (!isCancelling)
            {
                var referenceNo = $"ORD-{order.OrderId}";

                var dispatch = await _db.Dispatches
                    .AsNoTracking()
                    .FirstOrDefaultAsync(d => d.ReferenceNo == referenceNo);

                if (dispatch == null || dispatch.ConfirmedAt == null)
                {
                    return BadRequest(new
                    {
                        message = "Kho chưa xác nhận phiếu xuất, không thể cập nhật trạng thái đơn hàng."
                    });
                }
            }

            // Nếu đơn đã hoàn tất thì không cho đổi sang trạng thái khác (trừ việc set lại Completed chính nó)
            if (IsCompleted(order.Status) && !IsCompleted(newStatus))
            {
                return BadRequest(new { message = "Completed order cannot change status." });
            }

            // Cập nhật trạng thái
            order.Status = newStatus;

            // =========================
            // TẠO HÓA ĐƠN THEO LUỒNG
            // =========================
            // Cả QR và COD: chỉ tạo invoice khi trạng thái mới là Completed
            // (COD vẫn bị ép phải đi qua Paid trước Completed ở trên)
            bool shouldCreateInvoice = IsCompleted(newStatus) && order.Invoice == null;

            if (shouldCreateInvoice)
            {
                var items = order.Items.ToList();

                var subtotal = items.Sum(it => it.UnitPrice * it.Quantity);
                var discount = 0m;
                var tax = 0m;
                var total = subtotal - discount + tax;

                var invoice = new Invoice
                {
                    Code = $"INV-{DateTime.UtcNow:yyyyMMddHHmmss}-{order.OrderId}",
                    CreatedAt = DateTime.UtcNow,

                    OrderId = order.OrderId,
                    CustomerId = order.UserId,
                    CustomerName = order.Customer?.Name,
                    Email = order.Customer?.Email,
                    Phone = order.Customer?.PhoneNumber,

                    Subtotal = subtotal,
                    Discount = discount,
                    Tax = tax,
                    Total = total,
                    Status = InvoiceStatus.Paid,
                    Items = items.Select(oi => new InvoiceItem
                    {
                        ProductId = oi.ProductId,
                        ProductName = oi.Product?.ProductName ?? "",
                        Uom = "pcs",
                        Quantity = oi.Quantity,
                        UnitPrice = oi.UnitPrice,
                        LineTotal = oi.UnitPrice * oi.Quantity,
                        OrderCode = order.OrderId.ToString()
                    }).ToList()
                };

                _db.Set<Invoice>().Add(invoice);
            }

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // =========================================================
        // 4) LẤY ITEMS CHO 1 ORDER
        // GET /api/staff/orders/{id}/items
        // =========================================================
        [HttpGet("{id:int}/items")]
        public async Task<IActionResult> GetItems(int id)
        {
            try
            {
                var items = await (
                    from oi in _db.OrderItems.AsNoTracking()
                    join p in _db.Products.AsNoTracking()
                        on oi.ProductId equals p.ProductID
                    where oi.OrderId == id
                    select new
                    {
                        oi.OrderItemId,
                        oi.ProductId,
                        ProductName = p.ProductName,
                        p.ProductCode,
                        oi.Quantity,
                        oi.UnitPrice,
                        LineTotal = oi.Quantity * oi.UnitPrice
                    }
                ).ToListAsync();

                return Ok(items);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching items for order {OrderId}", id);
                return StatusCode(500, new { message = "Error fetching order items", detail = ex.Message });
            }
        }

        // =========================================================
        // 5) XÓA ĐƠN ĐÃ HỦY
        // DELETE /api/staff/orders/{id}
        // =========================================================
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var order = await _db.Orders
                .Include(o => o.Items)
                .Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null)
                return NotFound(new { message = "Order not found" });

            if (!string.Equals(order.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Chỉ được xóa đơn hàng đã ở trạng thái Đã hủy." });
            }

            if (order.Invoice != null)
            {
                return BadRequest(new { message = "Không thể xóa đơn đã có hóa đơn." });
            }

            var salesOrderNo = $"ORD-{id}";

            var dispatchIds = await _db.Dispatches
                .Where(d => d.ReferenceNo == salesOrderNo)
                .Select(d => d.Id)
                .ToListAsync();

            foreach (var dispatchId in dispatchIds)
            {
                await _dispathservice.DeleteDispatchSlipAsync(dispatchId);
            }

            _db.OrderItems.RemoveRange(order.Items);

            _db.Orders.Remove(order);

            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}
