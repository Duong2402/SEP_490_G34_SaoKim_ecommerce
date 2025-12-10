using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models.Requests;
using SaoKim_ecommerce_BE.Services;
using System.Security.Claims;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly SaoKimDBContext _context;
        private readonly ILogger<OrdersController> _logger;
        private readonly IOrdersService _ordersService;

        public OrdersController(
            SaoKimDBContext context,
            ILogger<OrdersController> logger,
            IOrdersService ordersService)
        {
            _context = context;
            _logger = logger;
            _ordersService = ordersService;
        }

        private async Task<User?> GetCurrentUserAsync()
        {
            var email =
                User.FindFirstValue(ClaimTypes.Email) ??
                User.Identity?.Name;

            if (string.IsNullOrEmpty(email))
                return null;

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == email);

            return user;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateOrderRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return ValidationProblem(ModelState);

                var user = await GetCurrentUserAsync();
                if (user == null)
                    return Unauthorized("Không tìm thấy user tương ứng với token");

                try
                {
                    var result = await _ordersService.CreateOrderAsync(request, user);
                    return Ok(result);
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi tạo đơn hàng");
                return StatusCode(500, new { message = "Lỗi server khi tạo đơn hàng", detail = ex.Message });
            }
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                if (page <= 0) page = 1;
                if (pageSize <= 0) pageSize = 10;

                var user = await GetCurrentUserAsync();
                if (user == null)
                    return Unauthorized("Không tìm thấy user tương ứng với token");

                var (total, items) = await _ordersService.GetMyOrdersAsync(user.UserID, page, pageSize);

                return Ok(new
                {
                    total,
                    items
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi GetMyOrders");
                return StatusCode(500, new { message = "Lỗi server GetMyOrders", detail = ex.Message });
            }
        }
    }
}
