using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.Data;

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

        [HttpGet]
        public IActionResult GetProducts()
        {
            var products = _db.Products
                .Select(p => new { p.ProductID, p.ProductName })
                .ToList();
            return Ok(products);
        }
    }
}
