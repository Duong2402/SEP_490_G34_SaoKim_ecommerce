using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        public ProductsController(SaoKimDBContext db)
        {
            _db = db;
        }

        // GET: /api/products
        //[Authorize] // Cho phép mọi user đã đăng nhập
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? q,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortBy = "id",
            [FromQuery] string? sortDir = "asc")
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 10;

            IQueryable<Product> baseQuery = _db.Products
                .AsNoTracking()
                .Include(p => p.Category);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = $"%{q.Trim()}%";
                baseQuery = baseQuery.Where(p =>
                    EF.Functions.ILike(p.ProductName, term) ||
                    EF.Functions.ILike(p.ProductCode, term) ||
                    (p.Category != null && EF.Functions.ILike(p.Category.Name, term))   // 
                );
            }

            var total = await baseQuery.CountAsync();

            bool desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
            IQueryable<Product> ordered = (sortBy ?? string.Empty).ToLower() switch
            {
                "name" => desc ? baseQuery.OrderByDescending(p => p.ProductName) : baseQuery.OrderBy(p => p.ProductName),
                "sku" => desc ? baseQuery.OrderByDescending(p => p.ProductCode) : baseQuery.OrderBy(p => p.ProductCode),
                "category" => desc ? baseQuery.OrderByDescending(p => p.Category!.Name) : baseQuery.OrderBy(p => p.Category!.Name), // ✅
                "price" => desc ? baseQuery.OrderByDescending(p => p.Price) : baseQuery.OrderBy(p => p.Price),
                "stock" => desc ? baseQuery.OrderByDescending(p => p.Stock) : baseQuery.OrderBy(p => p.Stock),
                "status" => desc ? baseQuery.OrderByDescending(p => p.Status) : baseQuery.OrderBy(p => p.Status),
                "created" => desc ? baseQuery.OrderByDescending(p => p.Created) : baseQuery.OrderBy(p => p.Created),
                _ => desc ? baseQuery.OrderByDescending(p => p.ProductID) : baseQuery.OrderBy(p => p.ProductID),
            };

            var items = await ordered
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    id = p.ProductID,
                    sku = p.ProductCode,
                    name = p.ProductName,
                    category = p.Category != null ? p.Category.Name : null,  // 
                    price = p.Price,
                    unit = p.Unit,
                    stock = p.Stock,
                    status = p.Status,
                    created = p.CreateAt ?? p.Date
                })
                .ToListAsync();

            var payload = new
            {
                items,
                page,
                pageSize,
                total,
                totalPages = (int)Math.Ceiling(total / (double)pageSize)
            };

            return Ok(ApiResponse<object>.Ok(payload));
        }

        // DETAIL (PUBLIC) — trả về { product, related }
        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var product = await _db.Products.AsNoTracking()
                .Include(p => p.Category)
                .Where(p => p.ProductID == id)
                .Select(p => new {
                    id = p.ProductID,
                    sku = p.ProductCode,
                    name = p.ProductName,
                    category = p.Category != null ? p.Category.Name : null,  
                    price = p.Price,
                    stock = p.Stock,
                    status = p.Status,
                    created = p.Created,
                    unit = p.Unit,
                    quantity = p.Quantity,
                    description = p.Description,
                    supplier = p.Supplier,
                    image = p.Image != null ? $"/images/{p.Image}" : null,
                    note = p.Note
                })
                .FirstOrDefaultAsync();

            if (product == null) return NotFound(new { message = "Product not found" });

            var related = await _db.Products
                .AsNoTracking()
                .Where(x => x.Category!.Name == product.category && x.ProductID != id)
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

            return Ok(new { product = product, related });
        }

        // CREATE (YÊU CẦU QUYỀN)
        [HttpPost]
        [AllowAnonymous]
        //[Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] Product model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var exists = await _db.Products.AnyAsync(p => p.ProductCode == model.ProductCode);
            if (exists)
                return Conflict(new { message = "Product code already exists" });

            model.CreateAt = DateTime.UtcNow;
            model.Status ??= "Active";

            //  giờ Product dùng CategoryId (nullable). Nếu front còn gửi "category" là chuỗi,
            // hãy đổi front để gửi CategoryId, hoặc viết thêm logic map tên -> id ở đây.

            _db.Products.Add(model);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = model.ProductID }, model);
        }

        // UPDATE (YÊU CẦU QUYỀN)
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] Product update)
        {
            var existing = await _db.Products.FindAsync(id);
            if (existing == null)
                return NotFound(new { message = "Product not found" });

            existing.ProductCode = update.ProductCode;
            existing.ProductName = update.ProductName;
            existing.CategoryId = update.CategoryId;      //  dùng FK
            existing.Unit = update.Unit;
            existing.Price = update.Price;
            existing.Quantity = update.Quantity;
            existing.Stock = update.Stock;
            existing.Status = update.Status;
            existing.Description = update.Description;
            existing.Supplier = update.Supplier;
            existing.Note = update.Note;
            existing.Image = update.Image;
            existing.UpdateAt = DateTime.UtcNow;
            existing.UpdateBy = update.UpdateBy;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Product updated successfully" });
        }

        // DELETE (YÊU CẦU QUYỀN)
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _db.Products.FindAsync(id);
            if (existing == null)
                return NotFound(new { message = "Product not found" });

            _db.Products.Remove(existing);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Product deleted successfully" });
        }

        // GET: api/products/home
        [HttpGet("home")]
        [AllowAnonymous]
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

            var cutoff = DateTime.UtcNow.AddDays(-NewWithinDays);

            var featured = await _db.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Where(p => (p.Status == "Active" || p.Status == null) && p.Quantity > 0)
                .OrderByDescending(p => p.CreateAt ?? p.Date)
                .Take(8)
                .Select(p => new
                {
                    id = p.ProductID,
                    name = p.ProductName,
                    price = p.Price,
                    image = p.Image != null ? $"/images/{p.Image}" : null,
                    description = p.Description,
                    category = p.Category != null ? p.Category.Name : null, // 
                    createAt = p.CreateAt ?? p.Date,
                    quantity = p.Quantity
                })
                .ToListAsync();

            var newArrivals = await _db.Products
                .AsNoTracking()
                .Include(p => p.Category)
                .Where(p => (p.Status == "Active" || p.Status == null))
                .Where(p => (p.CreateAt ?? p.Date) >= cutoff)
                .OrderByDescending(p => p.CreateAt ?? p.Date)
                .Take(12)
                .Select(p => new
                {
                    id = p.ProductID,
                    name = p.ProductName,
                    price = p.Price,
                    image = p.Image != null ? $"/images/{p.Image}" : null,
                    description = p.Description,
                    category = p.Category != null ? p.Category.Name : null, // 
                    createAt = p.CreateAt ?? p.Date,
                    quantity = p.Quantity
                })
                .ToListAsync();

            var q = _db.Products.AsNoTracking()
                .Include(p => p.Category)
                .Where(p => p.Status == "Active" || p.Status == null);

            if (!string.IsNullOrWhiteSpace(Keyword))
            {
                var kw = $"%{Keyword.Trim()}%";
                q = q.Where(p => EF.Functions.ILike(p.ProductName, kw));
            }

            if (!string.IsNullOrWhiteSpace(Category))
            {
                var cat = Category.Trim();
                q = q.Where(p => p.Category != null && p.Category.Name.ToLower() == cat.ToLower()); // ✅
            }

            q = SortBy switch
            {
                "price_asc" => q.OrderBy(p => p.Price).ThenByDescending(p => p.CreateAt ?? p.Date),
                "price_desc" => q.OrderByDescending(p => p.Price).ThenByDescending(p => p.CreateAt ?? p.Date),
                _ => q.OrderByDescending(p => p.CreateAt ?? p.Date)
            };

            var totalItems = await q.CountAsync();
            var items = await q.Skip((Page - 1) * PageSize).Take(PageSize)
                .Select(p => new
                {
                    id = p.ProductID,
                    name = p.ProductName,
                    price = p.Price,
                    image = p.Image != null ? $"/images/{p.Image}" : null,
                    description = p.Description,
                    category = p.Category != null ? p.Category.Name : null, // 
                    createAt = p.CreateAt ?? p.Date,
                    quantity = p.Quantity
                })
                .ToListAsync();

            return Ok(new
            {
                featured,
                newArrivals,
                all = new
                {
                    page = Page,
                    pageSize = PageSize,
                    totalItems,
                    totalPages = (int)Math.Ceiling((double)totalItems / PageSize),
                    items
                }
            });
        }
    }
}
