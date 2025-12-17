using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatbotController : ControllerBase
    {
        private readonly IChatbotService _chatbot;

        public ChatbotController(IChatbotService chatbot)
        {
            _chatbot = chatbot;
        }

        [HttpPost("message")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<ChatResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> SendMessage([FromBody] ChatRequestDto req, CancellationToken ct)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            var result = await _chatbot.HandleMessageAsync(baseUrl, req, ct);

            return Ok(ApiResponse<ChatResponseDto>.Ok(new ChatResponseDto
            {
                ReplyText = result.FinalText,
                SuggestedProducts = result.Products,
                QuickReplies = result.QuickReplies
            }));
        }
    }
}
