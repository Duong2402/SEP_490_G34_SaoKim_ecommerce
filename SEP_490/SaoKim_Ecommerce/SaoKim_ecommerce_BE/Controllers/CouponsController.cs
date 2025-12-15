using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
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
        private readonly SaoKimDBContext _db;

        public CouponsController(ICouponService svc, SaoKimDBContext db)
        {
            _svc = svc;
            _db = db;
        }

        // GET /api/coupons
        [HttpGet]
        public async Task<ActionResult<ApiResponse<PagedResult<CouponListItemDto>>>> List(
            [FromQuery] string? q,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string sortBy = "CreatedAt",
            [FromQuery] string sortDir = "desc")
        {
            var (items, total) = await _svc.ListAsync(q, status, page, pageSize, sortBy, sortDir);

            var result = new PagedResult<CouponListItemDto>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = total,
                Items = items
            };

            return Ok(ApiResponse<PagedResult<CouponListItemDto>>.Ok(result));
        }

        // GET /api/coupons/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<CouponDetailDto?>>> Get(int id)
        {
            var dto = await _svc.GetAsync(id);
            if (dto == null)
                return NotFound(ApiResponse<CouponDetailDto?>.Fail("Not found"));

            return Ok(ApiResponse<CouponDetailDto?>.Ok(dto));
        }

        // POST /api/coupons
        [HttpPost]
        public async Task<ActionResult<ApiResponse<int>>> Create([FromBody] CouponCreateUpdateDto dto)
        {
            var id = await _svc.CreateAsync(dto);
            return Ok(ApiResponse<int>.Ok(id));
        }

        // PUT /api/coupons/{id}
        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<string>>> Update(int id, [FromBody] CouponCreateUpdateDto dto)
        {
            await _svc.UpdateAsync(id, dto);
            return Ok(ApiResponse<string>.Ok("OK"));
        }

        // DELETE /api/coupons/{id}
        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<string>>> Delete(int id)
        {
            await _svc.DeleteAsync(id);
            return Ok(ApiResponse<string>.Ok("OK"));
        }

        // POST /api/coupons/{id}/deactivate
        [HttpPost("{id:int}/deactivate")]
        public async Task<ActionResult<ApiResponse<string>>> Deactivate(int id)
        {
            await _svc.DeactivateAsync(id);
            return Ok(ApiResponse<string>.Ok("OK"));
        }

        // POST /api/coupons/{id}/toggle
        [HttpPost("{id:int}/toggle")]
        public async Task<ActionResult<ApiResponse<string>>> Toggle(int id)
        {
            var ok = await _svc.ToggleStatusAsync(id);
            if (!ok) return NotFound(ApiResponse<string>.Fail("Coupon not found"));
            return Ok(ApiResponse<string>.Ok("OK"));
        }

        [HttpGet("validate")]
        [Authorize]
        public async Task<IActionResult> Validate([FromQuery] string code, [FromQuery] decimal subtotal)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return BadRequest(new { message = "Vui lòng nhập mã giảm giá" });
            }

            if (subtotal <= 0)
            {
                return BadRequest(new { message = "Giá trị đơn hàng không hợp lệ" });
            }

            var userId = 0;
            var email =
                User.FindFirstValue(ClaimTypes.Email) ??
                User.Identity?.Name;

            if (!string.IsNullOrEmpty(email))
            {
                var user = await _db.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Email == email);

                if (user != null)
                {
                    userId = user.UserID;
                }
            }

            var result = await _svc.ValidateForOrderAsync(code, subtotal, userId);

            if (!result.IsValid)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
    }
}
