using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

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
                    CreatedAt = p.CreateAt ?? p.Date,  
                    Stock = p.Quantity                   
                })
                .ToListAsync();

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

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var kw = query.Keyword.Trim();
                q = q.Where(p => EF.Functions.Like(p.ProductName, $"%{kw}%"));
            }

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
