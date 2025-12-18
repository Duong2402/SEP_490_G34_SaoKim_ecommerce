using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly ILogger<PaymentsController> _logger;

        public PaymentsController(
            IPaymentService paymentService,
            ILogger<PaymentsController> logger)
        {
            _paymentService = paymentService;
            _logger = logger;
        }

        [AllowAnonymous]
        [HttpGet("check-vietqr")]
        public async Task<IActionResult> CheckVietQr(
            [FromQuery] int amount,
            [FromQuery] string? paymentToken = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var result = await _paymentService.CheckVietQrAsync(amount, paymentToken, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi check VietQR");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { message = "Đã xảy ra lỗi khi kiểm tra VietQR." });
            }
        }
    }
}
