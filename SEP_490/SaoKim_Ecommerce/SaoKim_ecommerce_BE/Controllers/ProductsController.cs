using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;

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

        // GET: /api/products
        [HttpGet]
        public async Task<IActionResult> GetAll(
    [FromQuery] string? q,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 10,
    [FromQuery] string? sortBy = "id",
    [FromQuery] string? sortDir = "asc")
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 10;

            IQueryable<Product> baseQuery = _db.Products.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = $"%{q.Trim()}%";
                // ILIKE = so khớp không phân biệt hoa/thường trong Postgres
                baseQuery = baseQuery.Where(p =>
                    EF.Functions.ILike(p.ProductName, term) ||
                    EF.Functions.ILike(p.ProductCode, term) ||
                    EF.Functions.ILike(p.Category ?? "", term)
                );
            }

            var total = await baseQuery.CountAsync();

            bool desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
            IQueryable<Product> ordered = (sortBy ?? "").ToLower() switch
            {
                "name" => (desc ? baseQuery.OrderByDescending(p => p.ProductName) : baseQuery.OrderBy(p => p.ProductName)),
                "sku" => (desc ? baseQuery.OrderByDescending(p => p.ProductCode) : baseQuery.OrderBy(p => p.ProductCode)),
                "category" => (desc ? baseQuery.OrderByDescending(p => p.Category) : baseQuery.OrderBy(p => p.Category)),
                "price" => (desc ? baseQuery.OrderByDescending(p => p.Price) : baseQuery.OrderBy(p => p.Price)),
                "stock" => (desc ? baseQuery.OrderByDescending(p => p.Stock) : baseQuery.OrderBy(p => p.Stock)),
                "status" => (desc ? baseQuery.OrderByDescending(p => p.Status) : baseQuery.OrderBy(p => p.Status)),
                "created" => (desc ? baseQuery.OrderByDescending(p => p.Created) : baseQuery.OrderBy(p => p.Created)),
                _ => (desc ? baseQuery.OrderByDescending(p => p.ProductID) : baseQuery.OrderBy(p => p.ProductID)),
            };

            var items = await ordered
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new {
                    id = p.ProductID,
                    sku = p.ProductCode,
                    name = p.ProductName,
                    category = p.Category,
                    price = p.Price,
                    stock = p.Stock,
                    status = p.Status,
                    created = p.Created
                })
                .ToListAsync();

            return Ok(new
            {
                items,
                page,
                pageSize,
                total,
                totalPages = (int)Math.Ceiling(total / (double)pageSize)
            });
        }

        // GET: /api/products/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var product = await _db.Products.AsNoTracking()
                .FirstOrDefaultAsync(p => p.ProductID == id);

            if (product == null)
                return NotFound(new { message = "Product not found" });

            return Ok(product);
        }

        // POST: /api/products
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Product model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Kiểm tra trùng ProductCode
            var exists = await _db.Products.AnyAsync(p => p.ProductCode == model.ProductCode);
            if (exists)
                return Conflict(new { message = "Product code already exists" });

            model.CreateAt = DateTime.UtcNow;
            model.Status ??= "Active";

            _db.Products.Add(model);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = model.ProductID }, model);
        }

        // PUT: /api/products/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Product update)
        {
            var existing = await _db.Products.FindAsync(id);
            if (existing == null)
                return NotFound(new { message = "Product not found" });

            // Cập nhật các trường
            existing.ProductCode = update.ProductCode;
            existing.ProductName = update.ProductName;
            existing.Category = update.Category;
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

        // DELETE: /api/products/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _db.Products.FindAsync(id);
            if (existing == null)
                return NotFound(new { message = "Product not found" });

            _db.Products.Remove(existing);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Product deleted successfully" });
        }
    }
}
