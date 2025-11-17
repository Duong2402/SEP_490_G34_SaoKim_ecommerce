using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CouponsController : ControllerBase
    {
        private readonly ICouponService _svc;
        public CouponsController(ICouponService svc) { _svc = svc; }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<CouponListResponse>>> List(
            [FromQuery] string? q, [FromQuery] string? status,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 10,
            [FromQuery] string sortBy = "created", [FromQuery] string sortDir = "desc")
        {
            var (items, total) = await _svc.ListAsync(q, status, page, pageSize, sortBy, sortDir);
            var payload = new CouponListResponse { Items = items, Total = total, Page = page, PageSize = pageSize };
            return Ok(ApiResponse<CouponListResponse>.Ok(payload));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<CouponDetailDto>>> Get(int id)
        {
            var dto = await _svc.GetAsync(id);
            if (dto == null) return NotFound(ApiResponse<CouponDetailDto>.Fail("Coupon not found"));
            return Ok(ApiResponse<CouponDetailDto>.Ok(dto));
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<int>>> Create([FromBody] CouponCreateUpdateDto dto)
        {
            var id = await _svc.CreateAsync(dto);
            return Ok(ApiResponse<int>.Ok(id));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<string>>> Update(int id, [FromBody] CouponCreateUpdateDto dto)
        {
            await _svc.UpdateAsync(id, dto);
            return Ok(ApiResponse<string>.Ok("OK"));
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<string>>> Delete(int id)
        {
            await _svc.DeleteAsync(id);
            return Ok(ApiResponse<string>.Ok("OK"));
        }

        [HttpPost("{id:int}/deactivate")]
        public async Task<ActionResult<ApiResponse<string>>> Deactivate(int id)
        {
            await _svc.DeactivateAsync(id);
            return Ok(ApiResponse<string>.Ok("OK"));
        }

        // NEW: Toggle Active <-> Inactive
        [HttpPost("{id:int}/toggle")]
        public async Task<ActionResult<ApiResponse<string>>> Toggle(int id)
        {
            var ok = await _svc.ToggleStatusAsync(id);
            if (!ok) return NotFound(ApiResponse<string>.Fail("Coupon not found"));
            return Ok(ApiResponse<string>.Ok("OK"));
        }
    }
}
