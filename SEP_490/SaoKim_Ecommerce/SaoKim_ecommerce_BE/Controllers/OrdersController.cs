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
    [Authorize] // khách đặt hàng phải đăng nhập
    public class OrdersController : ControllerBase
    {
        private readonly SaoKimDBContext _context;
        private readonly ILogger<OrdersController> _logger;

        public OrdersController(SaoKimDBContext context, ILogger<OrdersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // POST /api/orders  -> FE gọi khi bấm Thanh toán
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateOrderRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                if (request.Items == null || request.Items.Count == 0)
                    return BadRequest(new { message = "Order must have at least 1 item" });

                // LẤY EMAIL TỪ TOKEN (giống như UsersController.GetMe)
                var email = User.Identity?.Name;
                if (string.IsNullOrEmpty(email))
                    return Unauthorized("Không xác định được người dùng từ token");

                // TÌM USER THEO EMAIL
                var user = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Email == email);

                if (user == null)
                    return Unauthorized("Không tìm thấy user tương ứng với token");

                // Lấy danh sách product liên quan từ DB
                var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
                var products = await _context.Products
                    .Where(p => productIds.Contains(p.ProductID))
                    .ToListAsync();

                if (products.Count != productIds.Count)
                    return BadRequest(new { message = "Some products not found" });

                // Tính lại total từ DB (không tin vào FE)
                decimal totalFromDb = 0;
                var orderItems = request.Items.Select(i =>
                {
                    var product = products.First(p => p.ProductID == i.ProductId);

                    var unitPrice = product.Price; // dùng giá Product.Price
                    var lineTotal = unitPrice * i.Quantity;
                    totalFromDb += lineTotal;

                    return new OrderItem
                    {
                        ProductId = i.ProductId,
                        Quantity = i.Quantity,
                        UnitPrice = unitPrice
                    };
                }).ToList();

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

                // trả về order id + total để FE hiển thị
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
