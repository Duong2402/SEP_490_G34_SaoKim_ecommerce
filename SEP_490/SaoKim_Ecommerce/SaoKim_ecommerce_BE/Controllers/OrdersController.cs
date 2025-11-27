using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models.Requests;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] 
    public class OrdersController : ControllerBase
    {
        private readonly SaoKimDBContext _context;
        private readonly ILogger<OrdersController> _logger;

        public OrdersController(SaoKimDBContext context, ILogger<OrdersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateOrderRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                if (request.Items == null || request.Items.Count == 0)
                    return BadRequest(new { message = "Order must have at least 1 item" });

                var email = User.Identity?.Name;
                if (string.IsNullOrEmpty(email))
                    return Unauthorized("Không xác định được người dùng từ token");

                var user = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Email == email);

                if (user == null)
                    return Unauthorized("Không tìm thấy user tương ứng với token");

                var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();

                if (productIds.Count == 0)
                    return BadRequest(new { message = "Order must have at least 1 valid product" });

                var details = await _context.ProductDetails
                    .Where(d => productIds.Contains(d.ProductID))
                    .GroupBy(d => d.ProductID)
                    .Select(g => g.OrderByDescending(d => d.Id).First())
                    .ToListAsync();

                if (details.Count != productIds.Count)
                    return BadRequest(new { message = "Some products not found or have no details" });

                var detailDict = details.ToDictionary(d => d.ProductID, d => d);

                decimal totalFromDb = 0m;
                var orderItems = new List<OrderItem>();

                foreach (var i in request.Items)
                {
                    if (!detailDict.TryGetValue(i.ProductId, out var detail))
                        return BadRequest(new { message = $"Product {i.ProductId} not found" });

                    var unitPrice = detail.Price; 
                    var lineTotal = unitPrice * i.Quantity;
                    totalFromDb += lineTotal;

                    orderItems.Add(new OrderItem
                    {
                        ProductId = i.ProductId,
                        Quantity = i.Quantity,
                        UnitPrice = unitPrice
                    });
                }

                var order = new Order
                {
                    UserId = user.UserID,
                    Total = totalFromDb,
                    Status = string.IsNullOrEmpty(request.Status) ? "Pending" : request.Status!,
                    CreatedAt = DateTime.UtcNow,
                    Items = orderItems
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    order.OrderId,
                    order.Total,
                    order.Status,
                    order.CreatedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi tạo order");
                return StatusCode(500, new { message = "Lỗi server khi tạo đơn hàng", detail = ex.Message });
            }
        }


        // GET /api/orders  (khách xem đơn của chính mình)
        [HttpGet]
        public async Task<IActionResult> GetMyOrders()
        {
            var email = User.Identity?.Name;
            if (string.IsNullOrEmpty(email))
                return Unauthorized("Không xác định được người dùng từ token");

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
                return Unauthorized("Không tìm thấy user tương ứng với token");

            var orders = await _context.Orders
                .AsNoTracking()
                .Where(o => o.UserId == user.UserID)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return Ok(orders);
        }
    }
}
