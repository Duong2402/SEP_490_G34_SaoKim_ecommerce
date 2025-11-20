using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

        // POST /api/orders  -> FE gọi khi bấm Thanh toán
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateOrderRequest request)
        {
            try
            {
                // LẤY EMAIL TỪ TOKEN (giống như UsersController.GetMe)
                var email = User.Identity?.Name;
                if (string.IsNullOrEmpty(email))
                {
                    return Unauthorized("Không xác định được người dùng từ token");
                }

                // TÌM USER THEO EMAIL
                var user = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Email == email);

                if (user == null)
                {
                    return Unauthorized("Không tìm thấy user tương ứng với token");
                }

                // TẠO ORDER VỚI USERID LẤY TỪ DB
                var order = new Order
                {
                    UserId = user.UserID,
                    Total = request.Total,
                    Status = string.IsNullOrEmpty(request.Status) ? "Pending" : request.Status!,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                return Ok(order);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi tạo order");
                return StatusCode(500, new { message = "Lỗi server khi tạo đơn hàng", detail = ex.Message });
            }
        }

        // GET /api/orders  (để test nhanh dữ liệu đã lưu)
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
