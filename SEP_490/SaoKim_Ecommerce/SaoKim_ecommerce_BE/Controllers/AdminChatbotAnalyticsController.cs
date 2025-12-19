using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.Services;
using SaoKim_ecommerce_BE.Services.ChatbotAnalytics;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/admin/chatbot")]
    [Authorize(Roles = "admin")]
    public class AdminChatbotAnalyticsController : ControllerBase
    {
        private readonly IAdminChatbotAnalyticsReportService _report;

        public AdminChatbotAnalyticsController(IAdminChatbotAnalyticsReportService report)
        {
            _report = report;
        }

        [HttpGet("overview")]
        public async Task<IActionResult> Overview([FromQuery] string from, [FromQuery] string to, CancellationToken ct)
        {
            var (fromUtc, toUtc) = ParseRange(from, to);
            var data = await _report.GetOverviewAsync(fromUtc, toUtc, ct);
            return Ok(data);
        }

        [HttpGet("timeseries")]
        public async Task<IActionResult> Timeseries([FromQuery] string from, [FromQuery] string to, [FromQuery] string bucket = "day", CancellationToken ct = default)
        {
            var (fromUtc, toUtc) = ParseRange(from, to);
            var data = await _report.GetTimeseriesDailyAsync(fromUtc, toUtc, ct);
            return Ok(data);
        }

        [HttpGet("top-questions")]
        public async Task<IActionResult> TopQuestions([FromQuery] string from, [FromQuery] string to, [FromQuery] int limit = 10, CancellationToken ct = default)
        {
            var (fromUtc, toUtc) = ParseRange(from, to);
            var data = await _report.GetTopQuestionsAsync(fromUtc, toUtc, Clamp(limit, 1, 50), ct);
            return Ok(data);
        }

        [HttpGet("top-keywords")]
        public async Task<IActionResult> TopKeywords([FromQuery] string from, [FromQuery] string to, [FromQuery] int limit = 10, CancellationToken ct = default)
        {
            var (fromUtc, toUtc) = ParseRange(from, to);
            var data = await _report.GetTopKeywordsAsync(fromUtc, toUtc, Clamp(limit, 1, 50), ct);
            return Ok(data);
        }

        [HttpGet("top-products-clicked")]
        public async Task<IActionResult> TopProductsClicked([FromQuery] string from, [FromQuery] string to, [FromQuery] int limit = 10, CancellationToken ct = default)
        {
            var (fromUtc, toUtc) = ParseRange(from, to);
            var data = await _report.GetTopProductsClickedAsync(fromUtc, toUtc, Clamp(limit, 1, 50), ct);
            return Ok(data);
        }

        private static (DateTime fromUtc, DateTime toUtc) ParseRange(string from, string to)
        {
            if (!DateTime.TryParse(from, out var f)) f = DateTime.UtcNow.Date.AddDays(-6);
            if (!DateTime.TryParse(to, out var t)) t = DateTime.UtcNow.Date.AddDays(1);

            var fromUtc = DateTime.SpecifyKind(f.Date, DateTimeKind.Utc);
            var toUtc = DateTime.SpecifyKind(t.Date.AddDays(1), DateTimeKind.Utc);

            return (fromUtc, toUtc);
        }

        private static int Clamp(int v, int min, int max) => v < min ? min : (v > max ? max : v);
    }
}
