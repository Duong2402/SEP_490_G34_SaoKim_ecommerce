using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly ILogger<PaymentsController> _logger;

        public PaymentsController(IPaymentService paymentService, ILogger<PaymentsController> logger)
        {
            _paymentService = paymentService;
            _logger = logger;
        }

        [HttpGet("check-vietqr")]
        [ProducesResponseType(typeof(VietQrCheckResultDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> CheckVietQr([FromQuery] int amount, CancellationToken cancellationToken)
        {
            if (amount <= 0)
                return BadRequest(new { message = "Số tiền phải lớn hơn 0" });

            try
            {
                var result = await _paymentService.CheckVietQrAsync(amount, cancellationToken);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                // lỗi do cấu hình hoặc gọi script thất bại
                _logger.LogError(ex, "Lỗi khi kiểm tra VietQR");
                return StatusCode(502, new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không xác định khi kiểm tra VietQR");
                return StatusCode(500, new { message = "Lỗi server khi kiểm tra VietQR", detail = ex.Message });
            }
        }
    }
}
