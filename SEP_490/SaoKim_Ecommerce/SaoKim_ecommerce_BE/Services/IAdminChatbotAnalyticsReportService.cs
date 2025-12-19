using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IAdminChatbotAnalyticsReportService
    {
        Task<ChatbotOverviewDto> GetOverviewAsync(DateTime fromUtc, DateTime toUtc, CancellationToken ct);
        Task<List<ChatbotTimeseriesPointDto>> GetTimeseriesDailyAsync(DateTime fromUtc, DateTime toUtc, CancellationToken ct);
        Task<List<ChatbotTopItemDto>> GetTopQuestionsAsync(DateTime fromUtc, DateTime toUtc, int limit, CancellationToken ct);
        Task<List<ChatbotTopItemDto>> GetTopKeywordsAsync(DateTime fromUtc, DateTime toUtc, int limit, CancellationToken ct);
        Task<List<ChatbotTopProductClickDto>> GetTopProductsClickedAsync(DateTime fromUtc, DateTime toUtc, int limit, CancellationToken ct);
    }
}
