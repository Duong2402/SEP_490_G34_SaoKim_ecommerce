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
                    Sku = x.Product.ProductCode,
                    Slug = null,

                    Category = x.Detail!.Category != null ? x.Detail.Category.Name : null,
                    Description = x.Detail.Description,

                    Price = x.Detail!.Price,
                    Unit = x.Detail!.Unit,

                    ThumbnailUrl = x.Detail.Image,
                    CreatedAt = x.Detail.CreateAt,

                    Quantity = x.Detail.Quantity,
                    Stock = x.Detail.Quantity,
                    Status = x.Detail.Status
                })
                .ToListAsync();

            var cutoff = DateTime.UtcNow.AddDays(-Math.Max(0, query.NewWithinDays));

            var newArrivals = await productWithDetail
                .Where(x =>
                    x.Detail != null &&
                    (x.Detail.Status == "Active" || x.Detail.Status == null) &&
                    x.Detail.CreateAt >= cutoff)
                .OrderByDescending(x => x.Detail!.CreateAt)
                .Take(12)
                .Select(x => new ProductListItemDto
                {
                    Id = x.Product.ProductID,
                    Name = x.Product.ProductName,
                    Sku = x.Product.ProductCode,
                    Slug = null,

                    Category = x.Detail!.Category != null ? x.Detail.Category.Name : null,
                    Description = x.Detail.Description,

                    Price = x.Detail!.Price,
                    Unit = x.Detail!.Unit,

                    ThumbnailUrl = x.Detail.Image,
                    CreatedAt = x.Detail.CreateAt,

                    Quantity = x.Detail.Quantity,
                    Stock = x.Detail.Quantity,
                    Status = x.Detail.Status
                })
                .ToListAsync();

            var all = await GetPagedAsync(query);

            // Apply promotion cho cả 3 cụm
            await ApplyPromotionAsync(featured);
            await ApplyPromotionAsync(newArrivals);
            await ApplyPromotionAsync(all.Items);

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

            if (query.CategoryId.HasValue)
            {
                var cid = query.CategoryId.Value;
                q = q.Where(x => x.Detail != null && x.Detail.CategoryId == cid);
            }

            q = (query.SortBy ?? "new").ToLowerInvariant() switch
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
                    Sku = x.Product.ProductCode,
                    Slug = null,

                    Category = x.Detail!.Category != null ? x.Detail.Category.Name : null,
                    Description = x.Detail.Description,

                    Price = x.Detail!.Price,
                    Unit = x.Detail!.Unit,

                    ThumbnailUrl = x.Detail.Image,
                    CreatedAt = x.Detail.CreateAt,

                    Quantity = x.Detail.Quantity,
                    Stock = x.Detail.Quantity,
                    Status = x.Detail.Status
                })
                .ToListAsync();

            // Apply promotion cho page list
            await ApplyPromotionAsync(items);

            return new PagedResult<ProductListItemDto>
            {
                Page = query.Page,
                PageSize = query.PageSize,
                TotalItems = total,
                Items = items
            };
        }

        private async Task ApplyPromotionAsync(IEnumerable<ProductListItemDto> items)
        {
            var list = items?.ToList() ?? new List<ProductListItemDto>();
            if (list.Count == 0) return;

            var ids = list.Select(x => x.Id).Distinct().ToList();
            var promosByProduct = await GetActivePromotionsByProductIdAsync(ids);

            foreach (var item in list)
            {
                if (!promosByProduct.TryGetValue(item.Id, out var promos) || promos.Count == 0)
                    continue;

                var basePrice = item.Price;

                Promotion? best = null;
                var bestFinal = basePrice;

                foreach (var p in promos)
                {
                    var final = CalcFinalPrice(basePrice, p.DiscountType, p.DiscountValue);

                    if (final < bestFinal)
                    {
                        bestFinal = final;
                        best = p;
                    }
                    else if (final == bestFinal && best != null)
                    {
                        // Tie-break: ưu tiên promotion UpdatedAt/CreatedAt mới hơn
                        var bestTime = best.UpdatedAt ?? best.CreatedAt;
                        var pTime = p.UpdatedAt ?? p.CreatedAt;
                        if (pTime > bestTime)
                        {
                            bestFinal = final;
                            best = p;
                        }
                    }
                }

                if (best != null && bestFinal < basePrice)
                {
                    item.OriginalPrice = basePrice;
                    item.Price = bestFinal;

                    item.AppliedPromotionId = best.Id;
                    item.AppliedPromotionName = best.Name;
                    item.AppliedDiscountType = best.DiscountType.ToString();
                    item.AppliedDiscountValue = best.DiscountValue;
                }
            }
        }

        private async Task<Dictionary<int, List<Promotion>>> GetActivePromotionsByProductIdAsync(List<int> productIds)
        {
            if (productIds.Count == 0) return new();

            var now = DateTimeOffset.UtcNow;

            var rows = await _db.PromotionProducts
                .AsNoTracking()
                .Where(pp => productIds.Contains(pp.ProductId))
                .Select(pp => new
                {
                    pp.ProductId,
                    Promo = pp.Promotion
                })
                .Where(x =>
                    (x.Promo.Status == PromotionStatus.Active || x.Promo.Status == PromotionStatus.Scheduled) &&
                    x.Promo.StartDate <= now &&
                    now <= x.Promo.EndDate
                )
                .ToListAsync();

            return rows
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Promo).ToList());
        }

        private static decimal CalcFinalPrice(decimal basePrice, DiscountType type, decimal value)
        {
            decimal final;

            if (type == DiscountType.Percentage)
            {
                final = basePrice * (1 - (value / 100m));
            }
            else if (type == DiscountType.FixedAmount)
            {
                final = basePrice - value;
            }
            else
            {
                final = basePrice;
            }

            if (final < 0) final = 0;
            return Math.Round(final, 2, MidpointRounding.AwayFromZero);
        }
    }
}
