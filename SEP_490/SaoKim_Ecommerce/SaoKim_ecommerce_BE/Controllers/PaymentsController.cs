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
        public async Task<IActionResult> CheckVietQr([FromQuery] int amount, [FromQuery] string? paymentToken = null)
        {
            var scriptUrl = "https://script.google.com/macros/s/AKfycbwKiGzxdPq4n_Xl-PvAokMhpDdmTrty8DUlEf63Vw_kr3UJY6rE2NfqwyabS5uhdU4LNw/exec";
            var response = await _httpClient.GetAsync(scriptUrl);
            if (!response.IsSuccessStatusCode)
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

            const string targetAccount = "0000126082016";
            var targetAmount = amount;

            var tokenUpper = paymentToken?.ToUpperInvariant();

            bool matched = false;
            foreach (var row in dataElem.EnumerateArray())
            {
                var account = row.GetProperty("Số tài khoản").GetString();
                var value = row.GetProperty("Giá trị").GetInt32();
                var descRaw = row.GetProperty("Mô tả").GetString() ?? string.Empty;
                var descUpper = descRaw.ToUpperInvariant();
                var descMatchBasic =
                    descUpper.Contains("THANH TOAN") ||
                    descUpper.Contains("CHUYEN TIEN");
                var descMatchToken = string.IsNullOrEmpty(tokenUpper)
                    ? true
                    : descUpper.Contains(tokenUpper);

                if (account == targetAccount &&
                    value == targetAmount &&
                    descMatchBasic &&
                    descMatchToken)
                {
                    matched = true;
                    break;
                }
            }
        }
    }
}