using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IProductReviewService
    {
        Task<ProductReviewSummaryDto> GetReviewsAsync(int productId);
        Task<ProductReviewSummaryDto> WriteOrUpdateReviewAsync(
            int productId,
            int userId,
            int rating,
            string? comment);
    }
}
