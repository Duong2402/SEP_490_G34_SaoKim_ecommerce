using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IChatbotService
    {
        Task<ChatOrchestratorResult> HandleMessageAsync(string baseUrl, ChatRequestDto req, CancellationToken ct);
    }
}
