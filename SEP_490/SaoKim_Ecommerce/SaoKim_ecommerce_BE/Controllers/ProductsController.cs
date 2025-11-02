using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using System.Linq;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly SaoKimDBContext _db;

        public ProductsController(SaoKimDBContext db)
        {
            _db = db;
        }

        // GET: api/products  danh sách đơn giản – vẫn giữ
        [HttpGet]
        public async Task<IActionResult> GetProducts()
        {
            var products = await _db.Products
                .OrderByDescending(p => p.CreateAt ?? p.Date)
                .Select(p => new {
                    id = p.ProductID,
                    name = p.ProductName,
                    price = p.Price,
                    image = p.Image != null ? $"/images/{p.Image}" : null,
                    description = p.Description,
                    category = p.Category,
                    createAt = p.CreateAt ?? p.Date,
                    quantity = p.Quantity
                })
                .ToListAsync();

            return Ok(products);
        }

        // GET: api/products/home
        [HttpGet("home")]
        public async Task<IActionResult> GetHomeProducts(
    [FromQuery] int Page = 1,
    [FromQuery] int PageSize = 12,
    [FromQuery] string? SortBy = "new",
    [FromQuery] string? Keyword = null,
    [FromQuery] string? Category = null,
    [FromQuery] int NewWithinDays = 14 
)
        {
            Page = Math.Max(1, Page);
            PageSize = Math.Clamp(PageSize, 1, 100);

            var now = DateTime.UtcNow;
            var cutoff = now.AddDays(-NewWithinDays);

            // Featured (giữ nguyên)
            var featured = await _db.Products
                .AsNoTracking()
                .Where(p => (p.Status == "Active" || p.Status == null) && p.Quantity > 0)
                .OrderByDescending(p => p.CreateAt ?? p.Date)
                .Take(8)
                .Select(p => new {
                    id = p.ProductID,
                    name = p.ProductName,
                    price = p.Price,
                    image = p.Image != null ? $"/images/{p.Image}" : null,
                    description = p.Description,
                    category = p.Category,
                    createAt = p.CreateAt ?? p.Date,
                    quantity = p.Quantity
                })
                .ToListAsync();

            // New Arrivals: chỉ lấy trong X ngày gần đây
            var newArrivals = await _db.Products
                .AsNoTracking()
                .Where(p => (p.Status == "Active" || p.Status == null))
                .Where(p => (p.CreateAt ?? p.Date) >= cutoff) 
                .OrderByDescending(p => p.CreateAt ?? p.Date)
                .Take(12)
                .Select(p => new {
                    id = p.ProductID,
                    name = p.ProductName,
                    price = p.Price,
                    image = p.Image != null ? $"/images/{p.Image}" : null,
                    description = p.Description,
                    category = p.Category,
                    createAt = p.CreateAt ?? p.Date,
                    quantity = p.Quantity
                })
                .ToListAsync();

            // All: bộ lọc/sort/phân trang 
            var q = _db.Products.AsNoTracking()
                .Where(p => p.Status == "Active" || p.Status == null);

            if (!string.IsNullOrWhiteSpace(Keyword))
            {
                var kw = Keyword.Trim();
                q = q.Where(p => EF.Functions.ILike(p.ProductName, $"%{kw}%"));
            }

            if (!string.IsNullOrWhiteSpace(Category))
            {
                var cat = Category.Trim().ToLower();
                q = q.Where(p => (p.Category ?? "").ToLower() == cat);
            }

            q = SortBy switch
            {
                "price_asc" => q.OrderBy(p => p.Price).ThenByDescending(p => p.CreateAt ?? p.Date),
                "price_desc" => q.OrderByDescending(p => p.Price).ThenByDescending(p => p.CreateAt ?? p.Date),
                _ => q.OrderByDescending(p => p.CreateAt ?? p.Date)
            };

            var totalItems = await q.CountAsync();

            var items = await q
                .Skip((Page - 1) * PageSize)
                .Take(PageSize)
                .Select(p => new {
                    id = p.ProductID,
                    name = p.ProductName,
                    price = p.Price,
                    image = p.Image != null ? $"/images/{p.Image}" : null,
                    description = p.Description,
                    category = p.Category,
                    createAt = p.CreateAt ?? p.Date,
                    quantity = p.Quantity
                })
                .ToListAsync();

            var all = new
            {
                page = Page,
                pageSize = PageSize,
                totalItems,
                totalPages = (int)Math.Ceiling((double)totalItems / PageSize),
                items
            };

            return Ok(new { featured, newArrivals, all });
        }
        // GET: api/products/123
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetProductById([FromRoute] int id)
        {
            var p = await _db.Products
                .AsNoTracking()
                .Where(x => x.ProductID == id)
                .Select(x => new
                {
                    id = x.ProductID,
                    name = x.ProductName,
                    code = x.ProductCode,
                    price = x.Price,
                    image = x.Image != null ? $"/images/{x.Image}" : null,
                    quantity = x.Quantity,
                    category = x.Category,
                    description = x.Description,
                    createdAt = x.CreateAt ?? x.Date
                })
                .FirstOrDefaultAsync();

            if (p == null) return NotFound();

            // gợi ý sản phẩm liên quan
            var related = await _db.Products
                .AsNoTracking()
                .Where(x => x.Category == p.category && x.ProductID != id)
                .OrderByDescending(x => x.CreateAt ?? x.Date)
                .Take(8)
                .Select(x => new
                {
                    id = x.ProductID,
                    name = x.ProductName,
                    price = x.Price,
                    image = x.Image != null ? $"/images/{x.Image}" : null
                })
                .ToListAsync();

            return Ok(new { product = p, related });
        }
    }
}
