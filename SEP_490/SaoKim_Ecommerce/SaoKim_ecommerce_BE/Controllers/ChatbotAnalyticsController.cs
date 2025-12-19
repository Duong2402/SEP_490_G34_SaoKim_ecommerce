using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/chatbot-analytics")]
    public class ChatbotAnalyticsController : ControllerBase
    {
        private readonly IChatbotAnalyticsService _analytics;

        public ChatbotAnalyticsController(IChatbotAnalyticsService analytics)
        {
            _analytics = analytics;
        }

        [HttpPost("session")]
        public async Task<IActionResult> UpsertSession([FromBody] ChatSessionUpsertDto dto, CancellationToken ct)
        {
            var s = await _analytics.UpsertSessionAsync(dto.SessionId, dto.UserId, dto.AnonymousId, dto.Page, dto.ProductId, dto.CategoryId, ct);
            return Ok(new { sessionId = s.Id });
        }

        [HttpPost("click")]
        public async Task<IActionResult> LogClick([FromBody] ChatClickDto dto, CancellationToken ct)
        {
            if (dto.SessionId == Guid.Empty) return BadRequest("SessionId is required");
            if (dto.ProductId <= 0) return BadRequest("ProductId is required");

            await _analytics.LogProductClickAsync(dto.SessionId, dto.MessageId, dto.ProductId, ct);
            return Ok(new { ok = true });
        }
    }
}
