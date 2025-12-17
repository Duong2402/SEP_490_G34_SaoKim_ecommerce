using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using System.Text.RegularExpressions;

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

            // 1) Nếu chưa có categoryId mà user hỏi theo danh mục, tự resolve categoryId theo tên category
            if (!categoryId.HasValue && !string.IsNullOrWhiteSpace(keyword))
            {
                var (catTerm, remainder) = ExtractCategoryTerm(keyword);

                // Nếu có cụm "danh mục/loại/category ..." thì dùng catTerm để lookup
                if (!string.IsNullOrWhiteSpace(catTerm))
                {
                    var catId = await _db.Categories
                        .AsNoTracking()
                        .Where(c => EF.Functions.ILike(c.Name, $"%{catTerm}%"))
                        .Select(c => c.Id)
                        .FirstOrDefaultAsync();

                    if (catId > 0)
                    {
                        categoryId = catId;
                        keyword = remainder; // bỏ phần danh mục ra khỏi keyword để tránh query bị lệch
                    }
                }
                else
                {
                    // Không có cụm "danh mục" rõ ràng, thử coi toàn bộ keyword là tên danh mục
                    // Ví dụ: "đèn trần", "đèn bàn", ...
                    var probe = keyword.Trim();
                    if (probe.Length >= 2 && probe.Length <= 60)
                    {
                        var catId = await _db.Categories
                            .AsNoTracking()
                            .Where(c => EF.Functions.ILike(c.Name, $"%{probe}%"))
                            .Select(c => c.Id)
                            .FirstOrDefaultAsync();

                        if (catId > 0)
                        {
                            categoryId = catId;
                            keyword = null; // đã dùng categoryId rồi thì bỏ keyword để không match sai
                        }
                    }
                }
            }

            // 2) Làm sạch keyword (loại keyword quá chung như "sản phẩm", "còn hàng"...)
            keyword = NormalizeKeyword(keyword);

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
                // Status mềm: null/empty/active (không phân biệt hoa thường)
                .Where(x =>
                    x.Detail!.Status == null ||
                    x.Detail.Status == "" ||
                    x.Detail.Status.ToLower() == "active"
                );

            if (inStockOnly)
                q = q.Where(x => x.Detail!.Quantity > 0);

            if (categoryId.HasValue)
                q = q.Where(x => x.Detail!.CategoryId == categoryId.Value);

            if (priceMin.HasValue)
                q = q.Where(x => x.Detail!.Price >= priceMin.Value);

            if (priceMax.HasValue)
                q = q.Where(x => x.Detail!.Price <= priceMax.Value);

            // keyword optional: chỉ filter khi keyword thực sự là "tên/mã/mô tả"
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
                .Where(x =>
                    x.Detail!.Status == null ||
                    x.Detail.Status == "" ||
                    x.Detail.Status.ToLower() == "active"
                )
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

        private static (string? categoryTerm, string? remainderKeyword) ExtractCategoryTerm(string keyword)
        {
            var s = keyword.Trim();

            // Bắt các mẫu: "danh mục X", "thuộc danh mục X", "loại X", "category X"
            // lấy phần X
            var lower = s.ToLowerInvariant();

            var markers = new[]
            {
                "thuộc danh mục",
                "danh mục",
                "loại",
                "category",
                "cate"
            };

            foreach (var m in markers)
            {
                var idx = lower.IndexOf(m, StringComparison.Ordinal);
                if (idx >= 0)
                {
                    var tail = s.Substring(idx + m.Length).Trim();
                    tail = tail.Trim(':', '-', '–', '—', '.', ',', ';');

                    // Nếu tail rỗng thì thôi
                    if (string.IsNullOrWhiteSpace(tail))
                        return (null, s);

                    // remainder: bỏ luôn cụm "danh mục ...", để keyword còn lại không bị match sai
                    // Ví dụ "gợi ý sản phẩm thuộc danh mục đèn trần" -> remainder "gợi ý sản phẩm"
                    var remainder = s.Remove(idx, (m.Length + (tail.Length > 0 ? (s.Substring(idx + m.Length).Length) : 0))).Trim();
                    remainder = Regex.Replace(remainder, @"\s{2,}", " ").Trim();

                    return (tail, string.IsNullOrWhiteSpace(remainder) ? null : remainder);
                }
            }

            return (null, s);
        }

        private static string? NormalizeKeyword(string? keyword)
        {
            if (string.IsNullOrWhiteSpace(keyword)) return null;

            var k = keyword.Trim();
            var lower = k.ToLowerInvariant();

            // Keyword quá chung / chỉ mang ý định lọc
            if (lower is "sản phẩm" or "san pham" or "đèn" or "den" or "đèn led" or "den led")
                return null;

            if (lower.Contains("còn hàng") || lower.Contains("con hang") || lower.Contains("available") || lower.Contains("in stock"))
                return null;

            if (lower.Contains("gợi ý") || lower.Contains("goi y") || lower.Contains("tư vấn") || lower.Contains("tu van") || lower.Contains("đề xuất") || lower.Contains("de xuat"))
                return null;

            if (k.Length < 2) return null;

            return k;
        }

        private static string? BuildImageUrl(string baseUrl, string? imageValue)
        {
            if (string.IsNullOrWhiteSpace(imageValue)) return null;

            if (Uri.TryCreate(imageValue, UriKind.Absolute, out _))
                return imageValue;

            var v = imageValue.Trim();

            if (v.StartsWith("/"))
                return baseUrl.TrimEnd('/') + v;

            return baseUrl.TrimEnd('/') + "/images/" + v;
        }
    }
}
