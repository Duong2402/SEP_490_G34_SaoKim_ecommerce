using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IChatbotAnalyticsService
    {
        Task<ChatSession> UpsertSessionAsync(Guid? sessionId, int? userId, string? anonymousId, string? page, int? productId, int? categoryId, CancellationToken ct);
        Task<ChatMessage> LogMessageAsync(Guid sessionId, string role, string text, CancellationToken ct);
        Task<ChatBotEvent> LogEventAsync(ChatBotEvent ev, CancellationToken ct);
        Task LogProductClickAsync(Guid sessionId, Guid? messageId, int productId, CancellationToken ct);
    }
}
