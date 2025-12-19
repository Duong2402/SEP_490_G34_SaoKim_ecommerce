using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services.ChatbotAnalytics
{

    public class AdminChatbotAnalyticsReportService : IAdminChatbotAnalyticsReportService
    {
        private readonly SaoKimDBContext _db;

        public AdminChatbotAnalyticsReportService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<ChatbotOverviewDto> GetOverviewAsync(DateTime fromUtc, DateTime toUtc, CancellationToken ct)
        {
            var sessionsQ = _db.ChatSessions.AsNoTracking()
                .Where(x => x.StartedAt >= fromUtc && x.StartedAt < toUtc);

            var messagesQ = _db.ChatMessages.AsNoTracking()
                .Where(x => x.CreatedAt >= fromUtc && x.CreatedAt < toUtc);

            var eventsQ = _db.ChatBotEvents.AsNoTracking()
                .Where(x => x.CreatedAt >= fromUtc && x.CreatedAt < toUtc);

            var totalSessions = await sessionsQ.CountAsync(ct);
            var totalMessages = await messagesQ.CountAsync(ct);

            var avgLatency = await eventsQ.AnyAsync(ct)
                ? await eventsQ.AverageAsync(x => (double)(x.LatencyMs ?? 0), ct)
                : 0;

            var faqCount = await eventsQ.CountAsync(x => x.ResponseType == "Faq", ct);
            var toolCount = await eventsQ.CountAsync(x => x.ResponseType == "ToolSearch" || x.ResponseType == "Similar", ct);
            var noResultCount = await eventsQ.CountAsync(x => x.ResponseType == "NoResult", ct);

            var clickCount = await _db.ChatProductClicks.AsNoTracking()
                .Where(x => x.CreatedAt >= fromUtc && x.CreatedAt < toUtc)
                .CountAsync(ct);

            var ctr = totalSessions > 0 ? (double)clickCount * 100.0 / totalSessions : 0;

            var evTotal = await eventsQ.CountAsync(ct);
            double rate(int n) => evTotal > 0 ? (double)n * 100.0 / evTotal : 0;

            return new ChatbotOverviewDto
            {
                TotalSessions = totalSessions,
                TotalMessages = totalMessages,
                AvgLatencyMs = avgLatency,
                FaqRate = rate(faqCount),
                ToolRate = rate(toolCount),
                NoResultRate = rate(noResultCount),
                Ctr = ctr
            };
        }

        public async Task<List<ChatbotTimeseriesPointDto>> GetTimeseriesDailyAsync(DateTime fromUtc, DateTime toUtc, CancellationToken ct)
        {
            var sessions = await _db.ChatSessions.AsNoTracking()
                .Where(x => x.StartedAt >= fromUtc && x.StartedAt < toUtc)
                .GroupBy(x => x.StartedAt.Date)
                .Select(g => new { Day = g.Key, Count = g.Count() })
                .ToListAsync(ct);

            var noResult = await _db.ChatBotEvents.AsNoTracking()
                .Where(x => x.CreatedAt >= fromUtc && x.CreatedAt < toUtc && x.ResponseType == "NoResult")
                .GroupBy(x => x.CreatedAt.Date)
                .Select(g => new { Day = g.Key, Count = g.Count() })
                .ToListAsync(ct);

            var sDict = sessions.ToDictionary(x => x.Day, x => x.Count);
            var nDict = noResult.ToDictionary(x => x.Day, x => x.Count);

            var days = new List<ChatbotTimeseriesPointDto>();
            for (var d = fromUtc.Date; d <= toUtc.Date; d = d.AddDays(1))
            {
                days.Add(new ChatbotTimeseriesPointDto
                {
                    Date = d.ToString("yyyy-MM-dd"),
                    Sessions = sDict.TryGetValue(d, out var sc) ? sc : 0,
                    NoResult = nDict.TryGetValue(d, out var nc) ? nc : 0
                });
            }

            return days;
        }

        public async Task<List<ChatbotTopItemDto>> GetTopQuestionsAsync(DateTime fromUtc, DateTime toUtc, int limit, CancellationToken ct)
        {
            var rows = await _db.ChatMessages.AsNoTracking()
                .Where(x => x.CreatedAt >= fromUtc && x.CreatedAt < toUtc && x.Role == "user")
                .GroupBy(x => x.Text)
                .Select(g => new ChatbotTopItemDto { Label = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ThenBy(x => x.Label)
                .Take(limit)
                .ToListAsync(ct);

            return rows;
        }

        public async Task<List<ChatbotTopItemDto>> GetTopKeywordsAsync(DateTime fromUtc, DateTime toUtc, int limit, CancellationToken ct)
        {
            var msgs = await _db.ChatMessages.AsNoTracking()
                .Where(x => x.CreatedAt >= fromUtc && x.CreatedAt < toUtc && x.Role == "user")
                .Select(x => x.Text)
                .ToListAsync(ct);

            var dict = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            foreach (var m in msgs)
            {
                var tokens = (m ?? "")
                    .ToLowerInvariant()
                    .Split(new[] { ' ', '\t', '\r', '\n', ',', '.', ';', ':', '!', '?', '/', '\\', '-', '_', '(', ')', '[', ']', '{', '}', '"' }, StringSplitOptions.RemoveEmptyEntries);

                foreach (var t in tokens)
                {
                    if (t.Length < 3) continue;
                    dict[t] = dict.TryGetValue(t, out var c) ? c + 1 : 1;
                }
            }

            return dict
                .OrderByDescending(x => x.Value)
                .ThenBy(x => x.Key)
                .Take(limit)
                .Select(x => new ChatbotTopItemDto { Label = x.Key, Count = x.Value })
                .ToList();
        }

        public async Task<List<ChatbotTopProductClickDto>> GetTopProductsClickedAsync(DateTime fromUtc, DateTime toUtc, int limit, CancellationToken ct)
        {
            var rows = await _db.ChatProductClicks.AsNoTracking()
                .Where(x => x.CreatedAt >= fromUtc && x.CreatedAt < toUtc)
                .GroupBy(x => x.ProductId)
                .Select(g => new { ProductId = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(limit)
                .ToListAsync(ct);

            var ids = rows.Select(x => x.ProductId).ToList();

            var names = await _db.Products.AsNoTracking()
                .Where(p => ids.Contains(p.ProductID))
                .ToDictionaryAsync(p => p.ProductID, p => p.ProductName, ct);

            return rows.Select(x => new ChatbotTopProductClickDto
            {
                ProductId = x.ProductId,
                Name = names.TryGetValue(x.ProductId, out var n) ? n : $"Product {x.ProductId}",
                Count = x.Count
            }).ToList();
        }
    }
}
