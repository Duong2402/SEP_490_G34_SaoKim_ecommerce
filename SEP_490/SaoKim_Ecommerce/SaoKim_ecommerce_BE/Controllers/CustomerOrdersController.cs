using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/customer/orders")]
    [Authorize]
    public class CustomerOrdersController : ControllerBase
    {
        private readonly ICustomerOrderService _service;

        public CustomerOrdersController(ICustomerOrderService service)
        {
            _service = service;
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("UserId") ?? User.FindFirst("userId");
            if (userIdClaim == null) return null;

            if (int.TryParse(userIdClaim.Value, out var id))
                return id;

            return null;
        }

        // GET /api/customer/orders/{orderId}
        [HttpGet("{orderId:int}")]
        public async Task<IActionResult> GetDetail(int orderId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Không xác định được người dùng từ token" });

            var detail = await _service.GetOrderDetailAsync(orderId, userId.Value);
            if (detail == null)
                return NotFound(new { message = "Không tìm thấy đơn hàng hoặc không thuộc về bạn" });

            return Ok(detail);
        }
    }
}
