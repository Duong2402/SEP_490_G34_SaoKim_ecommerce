using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentsController : ControllerBase
    {
        private readonly HttpClient _httpClient;

        public PaymentsController(IHttpClientFactory httpClientFactory)
        {
            _httpClient = httpClientFactory.CreateClient();
        }

        [HttpGet("check-vietqr")]
        public async Task<IActionResult> CheckVietQr([FromQuery] int amount)
        {
            var scriptUrl = "https://script.google.com/macros/s/AKfycbwKiGzxdPq4n_Xl-PvAokMhpDdmTrty8DUlEf63Vw_kr3UJY6rE2NfqwyabS5uhdU4LNw/exec";

            var response = await _httpClient.GetAsync(scriptUrl);
            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode,
                    "Không gọi được Apps Script");
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            if (!doc.RootElement.TryGetProperty("data", out var dataElem) ||
                dataElem.ValueKind != JsonValueKind.Array)
            {
                return Ok(new { matched = false });
            }

            const string targetAccount = "0000126082016";
            var targetAmount = amount;

            bool matched = false;
            foreach (var row in dataElem.EnumerateArray())
            {
                var account = row.GetProperty("Số tài khoản").GetString();
                var value = row.GetProperty("Giá trị").GetInt32();
                var desc = row.GetProperty("Mô tả").GetString()?.ToUpperInvariant() ?? "";

                if (account == targetAccount &&
                    (value == targetAmount) &&
                    (desc.Contains("THANH TOAN") || desc.Contains("CHUYEN TIEN")))
                {
                    matched = true;
                    break;
                }
            }

            return Ok(new { matched });
        }
    }
}
