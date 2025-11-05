using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public class ProductService : IProductService
    {
        private readonly SaoKimDBContext _db;

        public ProductService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<HomeProductsDto> GetHomeAsync(ProductQueryParams query)
        {
            // Featured: 8 sp mới nhất, còn hàng
            var featured = await _db.Products
                .AsNoTracking()
                .Where(p => (p.Status == "Active" || p.Status == null) && p.Quantity > 0)
                .OrderByDescending(p => p.CreateAt ?? p.Date)
                .Take(8)
                .Select(p => new ProductListItemDto
                {
                    Id = p.ProductID,
                    Name = p.ProductName,
                    Slug = null,
                    Price = p.Price,
                    ThumbnailUrl = p.Image,
                    CreatedAt = p.CreateAt ?? p.Date,   // DTO non-null
                    Stock = p.Quantity                   // thêm Stock để InStock tính đúng
                })
                .ToListAsync();

            // New arrivals: 12 sp mới nhất
            var newArrivals = await _db.Products
                .AsNoTracking()
                .Where(p => p.Status == "Active" || p.Status == null)
                .OrderByDescending(p => p.CreateAt ?? p.Date)
                .Take(12)
                .Select(p => new ProductListItemDto
                {
                    Id = p.ProductID,
                    Name = p.ProductName,
                    Slug = null,
                    Price = p.Price,
                    ThumbnailUrl = p.Image,
                    CreatedAt = p.CreateAt ?? p.Date,
                    Stock = p.Quantity
                })
                .ToListAsync();

            // All (paged + filter/sort)
            var all = await GetPagedAsync(query);

            return new HomeProductsDto
            {
                Featured = featured,
                NewArrivals = newArrivals,
                All = all
            };
        }

        public async Task<PagedResult<ProductListItemDto>> GetPagedAsync(ProductQueryParams query)
        {
            query.Page = Math.Max(1, query.Page);
            query.PageSize = Math.Clamp(query.PageSize, 1, 60);

            var q = _db.Products.AsNoTracking()
                .Where(p => p.Status == "Active" || p.Status == null);

            // Keyword
            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var kw = query.Keyword.Trim();
                q = q.Where(p => EF.Functions.Like(p.ProductName, $"%{kw}%"));
                // Nếu DB phân biệt hoa/thường, có thể dùng: p.ProductName.ToLower().Contains(kw.ToLower())
            }

            // Category (đề nghị đổi ProductQueryParams.CategoryId -> Category: string?)
            // Nếu bạn CHƯA đổi DTO, tạm bỏ lọc Category để tránh sai lệch kiểu.
            // if (!string.IsNullOrWhiteSpace(query.Category))
            //     q = q.Where(p => p.Category == query.Category);

            // Sort
            q = query.SortBy switch
            {
                "price_asc" => q.OrderBy(p => p.Price).ThenByDescending(p => p.CreateAt ?? p.Date),
                "price_desc" => q.OrderByDescending(p => p.Price).ThenByDescending(p => p.CreateAt ?? p.Date),
                _ => q.OrderByDescending(p => p.CreateAt ?? p.Date)
            };

            var total = await q.CountAsync();

            var items = await q
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(p => new ProductListItemDto
                {
                    Id = p.ProductID,
                    Name = p.ProductName,
                    Slug = null,
                    Price = p.Price,
                    ThumbnailUrl = p.Image,
                    CreatedAt = p.CreateAt ?? p.Date,
                    Stock = p.Quantity
                })
                .ToListAsync();

            return new PagedResult<ProductListItemDto>
            {
                Page = query.Page,
                PageSize = query.PageSize,
                TotalItems = total,
                Items = items
            };
        }
    }
}