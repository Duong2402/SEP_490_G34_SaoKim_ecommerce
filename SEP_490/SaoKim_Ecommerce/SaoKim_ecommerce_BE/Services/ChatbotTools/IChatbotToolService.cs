using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services.ChatbotTools
{
    public interface IChatbotToolService
    {
        Task<List<ChatProductCardDto>> SearchProductsAsync(
            string baseUrl,
            string? keyword,
            int? categoryId,
            decimal? priceMin,
            decimal? priceMax,
            bool inStockOnly,
            int limit);

        Task<List<ChatProductCardDto>> GetSimilarProductsAsync(string baseUrl, int productId, int limit);
    }
}
