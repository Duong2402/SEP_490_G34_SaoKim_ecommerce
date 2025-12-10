using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services
{
    public class ProductReviewService : IProductReviewService
    {
        private readonly SaoKimDBContext _db;

        public ProductReviewService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<ProductReviewSummaryDto> GetReviewsAsync(int productId)
        {
            var exists = await _db.Products.AnyAsync(p => p.ProductID == productId);
            if (!exists)
                throw new KeyNotFoundException("Không tìm thấy sản phẩm");

            var reviews = await _db.Reviews
                .AsNoTracking()
                .Where(r => r.ProductID == productId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ProductReviewListItemDto
                {
                    Id = r.ReviewID,
                    UserId = r.UserID,
                    UserName = r.User.Name,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();

            var avg = reviews.Count > 0
                ? reviews.Average(x => (double)x.Rating)
                : 0.0;

            return new ProductReviewSummaryDto
            {
                Items = reviews,
                AverageRating = Math.Round(avg, 2),
                Count = reviews.Count
            };
        }

        public async Task<ProductReviewSummaryDto> WriteOrUpdateReviewAsync(
            int productId,
            int userId,
            int rating,
            string? comment)
        {
            if (rating < 1 || rating > 5)
                throw new InvalidOperationException("Điểm đánh giá phải từ 1 đến 5");

            var product = await _db.Products.FirstOrDefaultAsync(p => p.ProductID == productId);
            if (product == null)
                throw new KeyNotFoundException("Không tìm thấy sản phẩm");

            var existing = await _db.Reviews
                .FirstOrDefaultAsync(r => r.ProductID == productId && r.UserID == userId);

            if (existing == null)
            {
                var review = new Review
                {
                    ProductID = productId,
                    UserID = userId,
                    Rating = rating,
                    Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim(),
                    CreatedAt = DateTime.UtcNow
                };
                _db.Reviews.Add(review);
            }
            else
            {
                existing.Rating = rating;
                existing.Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
                existing.CreatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            return await GetReviewsAsync(productId);
        }
    }
}
