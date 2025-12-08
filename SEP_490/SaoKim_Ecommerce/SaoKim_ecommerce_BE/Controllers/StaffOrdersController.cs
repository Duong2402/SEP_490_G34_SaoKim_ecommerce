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
    [Authorize(Roles = "staff")]
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

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                baseQuery = baseQuery.Where(o =>
                    o.OrderId.ToString().Contains(term) ||
                    (o.Customer.Name != null && o.Customer.Name.ToLower().Contains(term)) ||
                    (o.Customer.Email != null && o.Customer.Email.ToLower().Contains(term)) ||
                    (o.Customer.PhoneNumber != null && o.Customer.PhoneNumber.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var st = status.Trim().ToLower();
                baseQuery = baseQuery.Where(o => o.Status.ToLower() == st);
            }

            if (createdFrom.HasValue)
                baseQuery = baseQuery.Where(o => o.CreatedAt >= createdFrom.Value);

            if (createdTo.HasValue)
                baseQuery = baseQuery.Where(o => o.CreatedAt < createdTo.Value);

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
                    o.PaymentMethod,              
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
                paymentMethod = o.PaymentMethod,   
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

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var order = await _db.Orders
                .AsNoTracking()
                .Include(o => o.Customer)
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null) return NotFound();

            var dto = new
            {
                id = order.OrderId,
                code = $"ORD-{order.OrderId}",
                total = order.Total,
                status = order.Status,
                createdAt = order.CreatedAt,

                subtotal = order.Subtotal,
                discountAmount = order.DiscountAmount,
                shippingFee = order.ShippingFee,
                vatAmount = order.VatAmount,

                customerId = order.UserId,
                customerName = order.Customer?.Name,
                customerEmail = order.Customer?.Email,
                customerPhone = order.Customer?.PhoneNumber,

                payment = new
                {
                    method = order.PaymentMethod,
                    status = order.PaymentStatus,
                    transactionCode = order.PaymentTransactionCode,
                    paidAt = order.PaidAt
                },

                shippingRecipientName = order.ShippingRecipientName,
                shippingPhoneNumber = order.ShippingPhoneNumber,
                shippingLine1 = order.ShippingLine1,
                shippingWard = order.ShippingWard,
                shippingDistrict = order.ShippingDistrict,
                shippingProvince = order.ShippingProvince,

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


        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusRequest req)
        {
            var rawStatus = (req.Status ?? "").Trim();

            if (string.IsNullOrWhiteSpace(rawStatus))
                return BadRequest(new { message = "Status is required" });

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

            var paymentMethod = (order.PaymentMethod ?? "").Trim().ToUpperInvariant();
            var isCod = paymentMethod == "COD";
            var isQr = paymentMethod == "QR";

            if (isQr && IsPaid(newStatus))
            {
                return BadRequest(new { message = "Đơn thanh toán QR không có bước 'Đã thanh toán' riêng." });
            }

            if (isCod && IsCompleted(newStatus) && !IsPaid(order.Status))
            {
                return BadRequest(new { message = "Đơn COD phải chuyển sang 'Đã thanh toán' trước khi hoàn tất." });
            }

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

            if (IsCompleted(order.Status) && !IsCompleted(newStatus))
            {
                return BadRequest(new { message = "Completed order cannot change status." });
            }

            order.Status = newStatus;

            bool shouldCreateInvoice = IsCompleted(newStatus) && order.Invoice == null;

            if (shouldCreateInvoice)
            {
                var items = order.Items.ToList();

                var subtotal = items.Sum(it => it.UnitPrice * it.Quantity);

                var discount = 0m;

                var orderTotal = order.Total;

                var taxBase = subtotal - discount;
                if (taxBase < 0) taxBase = 0;

                var tax = Math.Round(taxBase * 0.10m, 0, MidpointRounding.AwayFromZero);

                var shippingFee = orderTotal - (subtotal - discount + tax);
                if (shippingFee < 0) shippingFee = 0;

                var total = subtotal - discount + tax + shippingFee;

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
                    ShippingFee = shippingFee,
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
