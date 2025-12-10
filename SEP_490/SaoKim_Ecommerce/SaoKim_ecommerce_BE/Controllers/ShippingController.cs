using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    public class ShippingController : ControllerBase
    {
        private readonly IShippingService _shippingService;

        public ShippingController(IShippingService shippingService)
        {
            _shippingService = shippingService;
        }

        // GET /api/shipping/fee?addressId=1&method=standard
        [HttpGet("fee")]
        public async Task<IActionResult> GetFee(
            [FromQuery] int addressId,
            [FromQuery] string method = "standard")
        {
            if (addressId <= 0)
                return BadRequest(new { message = "addressId không hợp lệ." });

            var result = await _shippingService.GetFeeAsync(addressId, method);
            if (result == null)
                return NotFound(new { message = "Không tìm thấy địa chỉ." });

            return Ok(result);
        }

        // GET /api/shipping/debug/1
        [HttpGet("debug/{addressId:int}")]
        public async Task<IActionResult> DebugAddress(int addressId)
        {
            var result = await _shippingService.DebugAddressAsync(addressId);
            if (result == null)
                return NotFound(new { message = "Không tìm thấy địa chỉ." });

            return Ok(result);
        }
    }
}
