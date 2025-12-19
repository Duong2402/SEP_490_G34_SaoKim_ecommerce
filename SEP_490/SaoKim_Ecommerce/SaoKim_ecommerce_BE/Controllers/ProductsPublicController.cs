using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("api/products")]
    public class ProductsPublicController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        private readonly IProductService _productService;

        public ProductsPublicController(SaoKimDBContext db, IProductService productService)
        {
            _db = db;
            _productService = productService;
        }

        // GET /api/products/public
        // params giống FE đang gửi: q, category, minPrice, maxPrice, sort, page, pageSize
        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublic(
            [FromQuery] string? q,
            [FromQuery] string? category,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice,
            [FromQuery] string? sort,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12
        )
        {
            int? categoryId = null;

            if (!string.IsNullOrWhiteSpace(category))
            {
                var cat = category.Trim().ToLowerInvariant();
                categoryId = await _db.Categories
                    .AsNoTracking()
                    .Where(c => c.Name != null && c.Name.ToLower() == cat)
                    .Select(c => (int?)c.Id)
                    .FirstOrDefaultAsync();
            }

            var query = new ProductQueryParams
            {
                Page = Math.Max(1, page),
                PageSize = Math.Clamp(pageSize, 1, 60),
                SortBy = string.IsNullOrWhiteSpace(sort) ? "new" : sort,
                Keyword = string.IsNullOrWhiteSpace(q) ? null : q.Trim(),
                CategoryId = categoryId
            };

            // Service đã apply promotion (theo patch trước đó)
            var result = await _productService.GetPagedAsync(query);

            // Lọc min/maxPrice ở phía response (giữ đơn giản, không ảnh hưởng DB query)
            // Lưu ý: totalItems/totalPages sẽ theo kết quả gốc trước lọc
            if (minPrice.HasValue || maxPrice.HasValue)
            {
                var min = minPrice ?? decimal.MinValue;
                var max = maxPrice ?? decimal.MaxValue;

                result.Items = result.Items
                    .Where(x => x.Price >= min && x.Price <= max)
                    .ToList();
            }

            return Ok(new
            {
                page = result.Page,
                pageSize = result.PageSize,
                totalItems = result.TotalItems,
                totalPages = (int)Math.Ceiling(result.TotalItems / (double)result.PageSize),
                items = result.Items
            });
        }

        public class PricesRequest
        {
            public List<int> ProductIds { get; set; } = new();
        }

        // POST /api/products/prices
        // body: { "productIds": [1,2,3] }
        [HttpPost("prices")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPrices([FromBody] PricesRequest req)
        {
            try
            {
                var ids = (req?.ProductIds ?? new List<int>())
                    .Where(x => x > 0)
                    .Distinct()
                    .Take(300)
                    .ToList();

                if (ids.Count == 0)
                    return Ok(Array.Empty<object>());

                var now = DateTimeOffset.UtcNow;

                // Lấy tất cả ProductDetails theo ProductID, sau đó GroupBy trên client
                var allDetails = await _db.ProductDetails
                    .AsNoTracking()
                    .Where(d => ids.Contains(d.ProductID))
                    .OrderByDescending(d => d.Id)
                    .Select(d => new
                    {
                        ProductId = d.ProductID,
                        BasePrice = d.Price
                    })
                    .ToListAsync();

                // GroupBy trên client để lấy detail mới nhất của mỗi product
                var basePriceDict = allDetails
                    .GroupBy(x => x.ProductId)
                    .ToDictionary(g => g.Key, g => g.First().BasePrice);

                var promoRows = await (from pp in _db.PromotionProducts.AsNoTracking()
                                       join pr in _db.Promotions.AsNoTracking() on pp.PromotionId equals pr.Id
                                       where ids.Contains(pp.ProductId)
                                             && (pr.Status == PromotionStatus.Active || pr.Status == PromotionStatus.Scheduled)
                                             && pr.StartDate <= now
                                             && now <= pr.EndDate
                                       select new
                                       {
                                           pp.ProductId,
                                           pr.DiscountType,
                                           pr.DiscountValue
                                       })
                                       .ToListAsync();

                static decimal CalcFinal(decimal basePrice, DiscountType type, decimal value)
                {
                    decimal final = basePrice;

                    if (type == DiscountType.Percentage)
                    {
                        final = basePrice * (1m - (value / 100m));
                    }
                    else if (type == DiscountType.FixedAmount)
                    {
                        final = basePrice - value;
                    }

                    if (final < 0) final = 0;
                    return Math.Round(final, 2, MidpointRounding.AwayFromZero);
                }

                var result = new List<object>(ids.Count);

                foreach (var id in ids)
                {
                    if (!basePriceDict.TryGetValue(id, out var basePrice))
                    {
                        result.Add(new { productId = id, price = 0m, originalPrice = (decimal?)null });
                        continue;
                    }

                    var best = basePrice;

                    foreach (var pr in promoRows.Where(x => x.ProductId == id))
                    {
                        var candidate = CalcFinal(basePrice, pr.DiscountType, pr.DiscountValue);
                        if (candidate < best) best = candidate;
                    }

                    result.Add(new
                    {
                        productId = id,
                        price = best,
                        originalPrice = best < basePrice ? basePrice : (decimal?)null
                    });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetPrices Error] {ex.Message}");
                return StatusCode(500, new { message = "Internal server error", detail = ex.Message });
            }
        }
    }
}
