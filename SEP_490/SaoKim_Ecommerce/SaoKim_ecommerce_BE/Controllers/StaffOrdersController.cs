using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/staff/orders")]
    [AllowAnonymous] // tạm thời; sau này dùng [Authorize(Roles="staff,admin,...")]
    public class StaffOrdersController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        private readonly ILogger<StaffOrdersController> _logger;

        public StaffOrdersController(SaoKimDBContext db, ILogger<StaffOrdersController> logger)
        {
            _db = db;
            _logger = logger;
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

            var items = await baseQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new
                {
                    id = o.OrderId,
                    code = $"ORD-{o.OrderId}",
                    customerName = o.Customer.Name,
                    customerEmail = o.Customer.Email,
                    customerPhone = o.Customer.PhoneNumber,
                    total = o.Total,
                    status = o.Status,
                    createdAt = o.CreatedAt,
                    hasInvoice = o.Invoice != null,
                    invoiceId = o.Invoice != null ? (int?)o.Invoice.Id : null
                })
                .ToListAsync();

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
        // 3) UPDATE STATUS + AUTO CREATE INVOICE KHI Paid
        // PATCH /api/staff/orders/{id}/status
        // =========================================================
        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusRequest req)
        {
            var newStatus = (req.Status ?? "").Trim();

            if (string.IsNullOrWhiteSpace(newStatus))
                return BadRequest(new { message = "Status is required" });

            var allowedStatuses = new[] { "Pending", "Shipping", "Paid", "Completed", "Cancelled" };
            if (!allowedStatuses.Contains(newStatus, StringComparer.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = $"Invalid status: {newStatus}" });
            }

            var order = await _db.Orders
                .Include(o => o.Customer)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Product)
                .Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null) return NotFound();

            if (string.Equals(order.Status, "Completed", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(newStatus, "Completed", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Completed order cannot change status." });
            }

            order.Status = newStatus;

            if (string.Equals(newStatus, "Paid", StringComparison.OrdinalIgnoreCase)
                && order.Invoice == null)
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
        // 4) LẤY ITEMS CHO 1 ORDER (NẾU MUỐN DÙNG RIÊNG)
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
    }
}
