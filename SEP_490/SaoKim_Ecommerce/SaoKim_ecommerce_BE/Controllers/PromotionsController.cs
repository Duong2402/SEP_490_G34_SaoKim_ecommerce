using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using SaoKim_ecommerce_BE.Services;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PromotionsController : ControllerBase
    {
        private readonly IPromotionService _svc;

        public PromotionsController(IPromotionService svc)
        {
            _svc = svc;
        }

        // GET /api/promotions
        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] string? q,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortBy = "created",
            [FromQuery] string? sortDir = "desc")
        {
            var (items, total) = await _svc.ListAsync(q, status, page, pageSize, sortBy, sortDir);

            var payload = new
            {
                items,
                total,
                page,
                pageSize
            };

            return Ok(ApiResponse<object>.Ok(payload));
        }

        // GET /api/promotions/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> Detail([FromRoute] int id)
        {
            var dto = await _svc.GetAsync(id);
            if (dto == null)
                return NotFound(ApiResponse<object>.Fail("Not found"));

            return Ok(ApiResponse<PromotionDetailDto>.Ok(dto));
        }

        // POST /api/promotions
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PromotionCreateDto dto)
        {
            var id = await _svc.CreateAsync(dto);
            var payload = new { id };
            return CreatedAtAction(nameof(Detail), new { id }, ApiResponse<object>.Ok(payload));
        }

        // PUT /api/promotions/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] PromotionUpdateDto dto)
        {
            var ok = await _svc.UpdateAsync(id, dto);
            if (!ok)
                return NotFound(ApiResponse<object>.Fail("Not found"));

            return Ok(ApiResponse<object>.Ok(new { }));
        }

        // DELETE /api/promotions/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete([FromRoute] int id)
        {
            var ok = await _svc.DeleteAsync(id);
            if (!ok)
                return NotFound(ApiResponse<object>.Fail("Not found"));

            return Ok(ApiResponse<object>.Ok(new { }));
        }

        public class PromotionProductLinkReq
        {
            public int ProductId { get; set; }
            public string? Note { get; set; }
        }

        // POST /api/promotions/{id}/products
        [HttpPost("{id:int}/products")]
        public async Task<IActionResult> AddProduct([FromRoute] int id, [FromBody] PromotionProductLinkReq req)
        {
            var ok = await _svc.AddProductAsync(id, req.ProductId, req.Note);
            if (!ok)
                return BadRequest(ApiResponse<object>.Fail("Invalid product or promotion"));

            return Ok(ApiResponse<object>.Ok(new { }));
        }

        // DELETE /api/promotions/products/{promotionProductId}
        [HttpDelete("products/{promotionProductId:int}")]
        public async Task<IActionResult> RemoveProduct([FromRoute] int promotionProductId)
        {
            var ok = await _svc.RemoveProductAsync(promotionProductId);
            if (!ok)
                return NotFound(ApiResponse<object>.Fail("Not found"));

            return Ok(ApiResponse<object>.Ok(new { }));
        }
    }
}
