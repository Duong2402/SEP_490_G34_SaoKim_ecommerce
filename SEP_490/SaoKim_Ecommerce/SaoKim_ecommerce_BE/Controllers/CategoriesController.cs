using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using System.Linq;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("api/[controller]")]
    public class CategoriesController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        public CategoriesController(SaoKimDBContext db) { _db = db; }

        // GET: /api/categories
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _db.Categories.AsNoTracking()
                .OrderBy(c => c.Name)
                .Select(c => new CategoryDto { Id = c.Id, Name = c.Name, Slug = c.Slug })
                .ToListAsync();
            return Ok(items);
        }

        // GET: /api/categories/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var c = await _db.Categories.AsNoTracking()
                .Where(x => x.Id == id)
                .Select(x => new CategoryDto { Id = x.Id, Name = x.Name, Slug = x.Slug })
                .FirstOrDefaultAsync();

            if (c == null) return NotFound(new { message = "Category not found" });
            return Ok(c);
        }

        // POST: /api/categories
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCategoryDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Name is required" });

            var exists = await _db.Categories
                .AnyAsync(x => x.Name.ToLower() == dto.Name.Trim().ToLower());
            if (exists)
                return Conflict(new { message = "Category already exists" });

            var cat = new Category
            {
                Name = dto.Name.Trim(),
                Slug = Slugify(dto.Name)
            };
            _db.Categories.Add(cat);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById),
                new { id = cat.Id },
                new CategoryDto { Id = cat.Id, Name = cat.Name, Slug = cat.Slug });
        }

        // PUT: /api/categories/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryDto dto)
        {
            var cat = await _db.Categories.FindAsync(id);
            if (cat == null) return NotFound(new { message = "Category not found" });

            if (!string.IsNullOrWhiteSpace(dto.Name))
            {
                var dup = await _db.Categories
                    .AnyAsync(x => x.Id != id && x.Name.ToLower() == dto.Name.Trim().ToLower());
                if (dup) return Conflict(new { message = "Category name already in use" });

                cat.Name = dto.Name.Trim();
            }

            cat.Slug = string.IsNullOrWhiteSpace(dto.Slug)
                ? Slugify(cat.Name)
                : dto.Slug!.Trim();

            await _db.SaveChangesAsync();
            return Ok(new { message = "Category updated" });
        }

        // DELETE: /api/categories/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var cat = await _db.Categories.FindAsync(id);
            if (cat == null) return NotFound(new { message = "Category not found" });

            bool hasProducts = await _db.ProductDetails.AnyAsync(p => p.CategoryId == id);
            if (hasProducts)
                return BadRequest(new { message = "Cannot delete: category has products" });

            _db.Categories.Remove(cat);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Category deleted" });
        }

        private static string Slugify(string input)
        {
            var s = input.Trim().ToLower();
            s = System.Text.RegularExpressions.Regex.Replace(s, @"\s+", "-");
            s = System.Text.RegularExpressions.Regex.Replace(s, @"[^a-z0-9\-]", "");
            return s;
        }
    }
}
