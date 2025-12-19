using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services.ChatbotAnalytics
{
    public class ChatbotAnalyticsService : IChatbotAnalyticsService
    {
        private readonly SaoKimDBContext _db;

        public ChatbotAnalyticsService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<ChatSession> UpsertSessionAsync(Guid? sessionId, int? userId, string? anonymousId, string? page, int? productId, int? categoryId, CancellationToken ct)
        {
            ChatSession? s = null;

            if (sessionId.HasValue)
                s = await _db.ChatSessions.FirstOrDefaultAsync(x => x.Id == sessionId.Value, ct);

            if (s == null)
            {
                s = new ChatSession
                {
                    Id = sessionId ?? Guid.NewGuid(),
                    UserId = userId,
                    AnonymousId = anonymousId,
                    StartedAt = DateTime.UtcNow
                };
                _db.ChatSessions.Add(s);
            }

            s.LastMessageAt = DateTime.UtcNow;
            s.Page = page ?? s.Page;
            s.ProductId = productId ?? s.ProductId;
            s.CategoryId = categoryId ?? s.CategoryId;

            if (userId.HasValue) s.UserId = userId;
            if (!string.IsNullOrWhiteSpace(anonymousId)) s.AnonymousId = anonymousId;

            await _db.SaveChangesAsync(ct);
            return s;
        }

        public async Task<ChatMessage> LogMessageAsync(Guid sessionId, string role, string text, CancellationToken ct)
        {
            var msg = new ChatMessage
            {
                SessionId = sessionId,
                Role = string.IsNullOrWhiteSpace(role) ? "user" : role.Trim().ToLowerInvariant(),
                Text = text ?? "",
                CreatedAt = DateTime.UtcNow
            };
            _db.ChatMessages.Add(msg);

            var s = await _db.ChatSessions.FirstOrDefaultAsync(x => x.Id == sessionId, ct);
            if (s != null) s.LastMessageAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return msg;
        }

        public async Task<ChatBotEvent> LogEventAsync(ChatBotEvent ev, CancellationToken ct)
        {
            ev.CreatedAt = DateTime.UtcNow;
            _db.ChatBotEvents.Add(ev);

            var s = await _db.ChatSessions.FirstOrDefaultAsync(x => x.Id == ev.SessionId, ct);
            if (s != null) s.LastMessageAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return ev;
        }

        public async Task LogProductClickAsync(Guid sessionId, Guid? messageId, int productId, CancellationToken ct)
        {
            var click = new ChatProductClick
            {
                SessionId = sessionId,
                MessageId = messageId,
                ProductId = productId,
                CreatedAt = DateTime.UtcNow
            };
            _db.ChatProductClicks.Add(click);

            var s = await _db.ChatSessions.FirstOrDefaultAsync(x => x.Id == sessionId, ct);
            if (s != null) s.LastMessageAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
        }
    }
}
