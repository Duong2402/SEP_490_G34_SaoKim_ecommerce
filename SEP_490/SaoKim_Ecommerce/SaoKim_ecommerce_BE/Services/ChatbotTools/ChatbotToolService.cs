using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services.ChatbotTools
{
    public class ChatbotToolService : IChatbotToolService
    {
        private readonly SaoKimDBContext _db;

        public ChatbotToolService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<List<ChatProductCardDto>> SearchProductsAsync(
            string baseUrl,
            string? keyword,
            int? categoryId,
            decimal? priceMin,
            decimal? priceMax,
            bool inStockOnly,
            int limit)
        {
            limit = Math.Clamp(limit, 1, 12);
            keyword = string.IsNullOrWhiteSpace(keyword) ? null : keyword.Trim();

            var q = _db.Products
                .AsNoTracking()
                .Select(p => new
                {
                    Product = p,
                    Detail = p.ProductDetails
                        .OrderByDescending(d => d.Id)
                        .FirstOrDefault()
                })
                .Where(x => x.Detail != null)
                .Where(x => x.Detail!.Status == null || x.Detail.Status == "Active");

            if (inStockOnly)
                q = q.Where(x => x.Detail!.Quantity > 0);

            if (categoryId.HasValue)
                q = q.Where(x => x.Detail!.CategoryId == categoryId.Value);

            if (priceMin.HasValue)
                q = q.Where(x => x.Detail!.Price >= priceMin.Value);

            if (priceMax.HasValue)
                q = q.Where(x => x.Detail!.Price <= priceMax.Value);

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var term = $"%{keyword}%";
                q = q.Where(x =>
                    EF.Functions.ILike(x.Product.ProductName, term) ||
                    EF.Functions.ILike(x.Product.ProductCode, term) ||
                    (x.Detail!.Description != null && EF.Functions.ILike(x.Detail.Description, term)) ||
                    (x.Detail!.Supplier != null && EF.Functions.ILike(x.Detail.Supplier, term))
                );
            }

            var data = await q
                .OrderByDescending(x => x.Detail!.Id)
                .Take(limit)
                .Select(x => new ChatProductCardDto
                {
                    Id = x.Product.ProductID,
                    Name = x.Product.ProductName,
                    Price = x.Detail!.Price,
                    Stock = x.Detail.Quantity,
                    Unit = x.Detail.Unit,
                    CategoryName = x.Detail.Category != null ? x.Detail.Category.Name : null,
                    ImageUrl = BuildImageUrl(baseUrl, x.Detail.Image)
                })
                .ToListAsync();

            return data;
        }

        public async Task<List<ChatProductCardDto>> GetSimilarProductsAsync(string baseUrl, int productId, int limit)
        {
            limit = Math.Clamp(limit, 1, 12);

            var product = await _db.Products
                .AsNoTracking()
                .Include(p => p.ProductDetails)
                    .ThenInclude(d => d.Category)
                .FirstOrDefaultAsync(p => p.ProductID == productId);

            if (product == null) return new List<ChatProductCardDto>();

            var latestDetail = product.ProductDetails
                .OrderByDescending(d => d.Id)
                .FirstOrDefault();

            if (latestDetail?.CategoryId == null)
            {
                return await SearchProductsAsync(baseUrl, null, null, null, null, true, limit);
            }

            var categoryId = latestDetail.CategoryId.Value;

            var q = _db.Products
                .AsNoTracking()
                .Where(p => p.ProductID != productId)
                .Select(p => new
                {
                    Product = p,
                    Detail = p.ProductDetails
                        .OrderByDescending(d => d.Id)
                        .FirstOrDefault()
                })
                .Where(x => x.Detail != null)
                .Where(x => x.Detail!.CategoryId == categoryId)
                .Where(x => x.Detail!.Status == null || x.Detail.Status == "Active")
                .Where(x => x.Detail!.Quantity > 0)
                .OrderByDescending(x => x.Detail!.Id)
                .Take(limit);

            return await q.Select(x => new ChatProductCardDto
            {
                Id = x.Product.ProductID,
                Name = x.Product.ProductName,
                Price = x.Detail!.Price,
                Stock = x.Detail.Quantity,
                Unit = x.Detail.Unit,
                CategoryName = x.Detail.Category != null ? x.Detail.Category.Name : null,
                ImageUrl = BuildImageUrl(baseUrl, x.Detail.Image)
            }).ToListAsync();
        }

        private static string? BuildImageUrl(string baseUrl, string? imageValue)
        {
            if (string.IsNullOrWhiteSpace(imageValue)) return null;

            if (Uri.TryCreate(imageValue, UriKind.Absolute, out _))
                return imageValue;

            var v = imageValue.Trim();

            // Nếu đang lưu dạng "/images/xxx.jpg" hoặc "/uploads/..."
            if (v.StartsWith("/"))
                return baseUrl.TrimEnd('/') + v;

            // Với dự án hiện tại, ảnh product được lưu trong wwwroot/images (filename)
            return baseUrl.TrimEnd('/') + "/images/" + v;
        }
    }
}
