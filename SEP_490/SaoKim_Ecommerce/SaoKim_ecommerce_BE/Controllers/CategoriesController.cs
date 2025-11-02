using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CategoriesController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        public CategoriesController(SaoKimDBContext db) { _db = db; }

        // GET /api/categories -> ["Đèn LED","Bóng đèn",...]
        [HttpGet]
        public async Task<IActionResult> GetDistinctCategories()
        {
            var list = await _db.Products
                .AsNoTracking()
                .Select(p => p.Category)
                .Where(c => c != null && c != "")
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            return Ok(list);
        }
    }
}
