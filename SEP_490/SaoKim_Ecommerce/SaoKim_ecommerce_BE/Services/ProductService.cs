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
            var productWithDetail = _db.Products
                .AsNoTracking()
                .Select(p => new
                {
                    Product = p,
                    Detail = p.ProductDetails
                        .OrderByDescending(d => d.Id)
                        .FirstOrDefault()
                });

            var featured = await productWithDetail
                .Where(x =>
                    x.Detail != null &&
                    (x.Detail.Status == "Active" || x.Detail.Status == null) &&
                    x.Detail.Quantity > 0)
                .OrderByDescending(x => x.Detail!.CreateAt)
                .Take(8)
                .Select(x => new ProductListItemDto
                {
                    Id = x.Product.ProductID,
                    Name = x.Product.ProductName,
                    Slug = null,
                    Price = x.Detail!.Price,
                    ThumbnailUrl = x.Detail.Image,
                    CreatedAt = x.Detail.CreateAt,
                    Stock = x.Detail.Quantity
                })
                .ToListAsync();

            var newArrivals = await productWithDetail
                .Where(x =>
                    x.Detail != null &&
                    (x.Detail.Status == "Active" || x.Detail.Status == null))
                .OrderByDescending(x => x.Detail!.CreateAt)
                .Take(12)
                .Select(x => new ProductListItemDto
                {
                    Id = x.Product.ProductID,
                    Name = x.Product.ProductName,
                    Slug = null,
                    Price = x.Detail!.Price,
                    ThumbnailUrl = x.Detail.Image,
                    CreatedAt = x.Detail.CreateAt,
                    Stock = x.Detail.Quantity
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

            var q = _db.Products
                .AsNoTracking()
                .Select(p => new
                {
                    Product = p,
                    Detail = p.ProductDetails
                        .OrderByDescending(d => d.Id)
                        .FirstOrDefault()
                });

            q = q.Where(x =>
                x.Detail != null &&
                (x.Detail.Status == "Active" || x.Detail.Status == null));

            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var kw = query.Keyword.Trim();
                q = q.Where(x => EF.Functions.Like(x.Product.ProductName, $"%{kw}%"));
            }

            q = query.SortBy switch
            {
                "price_asc" => q
                    .OrderBy(x => x.Detail!.Price)
                    .ThenByDescending(x => x.Detail!.CreateAt),

                "price_desc" => q
                    .OrderByDescending(x => x.Detail!.Price)
                    .ThenByDescending(x => x.Detail!.CreateAt),

                _ => q
                    .OrderByDescending(x => x.Detail!.CreateAt)
            };

            var total = await q.CountAsync();

            var items = await q
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(x => new ProductListItemDto
                {
                    Id = x.Product.ProductID,
                    Name = x.Product.ProductName,
                    Slug = null,
                    Price = x.Detail!.Price,
                    ThumbnailUrl = x.Detail.Image,
                    CreatedAt = x.Detail.CreateAt,
                    Stock = x.Detail.Quantity
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
