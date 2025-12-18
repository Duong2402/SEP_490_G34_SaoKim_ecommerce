using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services;
using System.Security.Claims;
using static SaoKim_ecommerce_BE.Entities.CustomerNote;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Authorize(Roles = "staff,manager,admin")]
    [Route("api/[controller]")]
    public class CustomersController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        private readonly ICustomerService _customerService;

        public CustomersController(SaoKimDBContext db, ICustomerService customerService)
        {
            _db = db;
            _customerService = customerService;
        }

        private int? GetCurrentStaffIdFromClaim(string claimType = "UserId")
        {
            var staffIdStr = User.FindFirstValue(claimType);
            if (int.TryParse(staffIdStr, out var staffId))
                return staffId;
            return null;
        }

        // GET /api/customers
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? q = null,
            [FromQuery] DateTime? createdFrom = null,
            [FromQuery] DateTime? createdTo = null,
            [FromQuery] decimal? minSpend = null,
            [FromQuery] int? minOrders = null,
            [FromQuery] string sortBy = "created",
            [FromQuery] string sortDir = "desc",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 200) pageSize = 10;

            var (items, total) = await _customerService.GetCustomersAsync(
                q,
                createdFrom,
                createdTo,
                minSpend,
                minOrders,
                sortBy,
                sortDir,
                page,
                pageSize);

            return Ok(new
            {
                total,
                page,
                pageSize,
                items
            });
        }

        // GET /api/customers/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var dto = await _customerService.GetCustomerDetailAsync(id);
            if (dto == null) return NotFound(new { message = "Không tìm thấy khách hàng" });

            return Ok(dto);
        }

        // GET /api/customers/{id}/orders
        [HttpGet("{id:int}/orders")]
        public async Task<IActionResult> GetOrders(
            int id,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 5)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 200) pageSize = 5;

            var exists = await _db.Users
                .AnyAsync(u => u.UserID == id && u.DeletedAt == null);

            if (!exists) return NotFound(new { message = "Không tìm thấy khách hàng" });

            var query = _db.Orders
                .AsNoTracking()
                .Where(o => o.UserId == id);

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new
                {
                    o.OrderId,
                    o.Total,
                    o.Status,
                    o.CreatedAt
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }

        // POST /api/customers/{id}/notes
        [HttpPost("{id:int}/notes")]
        [Authorize(Roles = "staff,manager,admin")]
        public async Task<IActionResult> AddNote(int id, [FromBody] CustomerNoteCreateRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Content))
                return BadRequest(new { message = "Nội dung ghi chú là bắt buộc" });

            var staffId = GetCurrentStaffIdFromClaim("UserId");
            if (staffId == null)
                return Forbid();

            try
            {
                var noteDto = await _customerService.AddNoteAsync(id, staffId.Value, req.Content);
                return Ok(new
                {
                    noteDto.Id,
                    noteDto.Content,
                    noteDto.CreatedAt,
                    noteDto.StaffId
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // PUT /api/customers/{customerId}/notes/{noteId}
        [HttpPut("{customerId:int}/notes/{noteId:int}")]
        public async Task<IActionResult> UpdateNote(
            int customerId,
            int noteId,
            [FromBody] CustomerNoteUpdateRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Content))
                return BadRequest(new { message = "Nội dung ghi chú là bắt buộc" });

            var noteDto = await _customerService.UpdateNoteAsync(customerId, noteId, req.Content);
            if (noteDto == null)
                return NotFound(new { message = "Không tìm thấy ghi chú" });

            return Ok(new
            {
                noteDto.Id,
                noteDto.Content,
                noteDto.CreatedAt,
                noteDto.StaffId
            });
        }

        // DELETE /api/customers/{customerId}/notes/{noteId}
        [HttpDelete("{customerId:int}/notes/{noteId:int}")]
        public async Task<IActionResult> DeleteNote(int customerId, int noteId)
        {
            var ok = await _customerService.DeleteNoteAsync(customerId, noteId);
            if (!ok) return NotFound(new { message = "Không tìm thấy ghi chú" });

            return NoContent();
        }

        // DELETE /api/customers/{id} (Soft delete)
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "staff,admin")]
        public async Task<IActionResult> SoftDelete(int id)
        {
            var staffIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(staffIdStr, out var staffId))
                return Forbid();

            var ok = await _customerService.SoftDeleteCustomerAsync(id, staffId);
            if (!ok) return NotFound(new { message = "Không tìm thấy khách hàng" });

            return NoContent();
        }

        // GET /api/customers/export
        [HttpGet("export")]
        [Authorize(Roles = "staff,admin")]
        public async Task<IActionResult> ExportExcel(
            [FromQuery] string? q = null,
            [FromQuery] DateTime? createdFrom = null,
            [FromQuery] DateTime? createdTo = null)
        {
            var (bytes, fileName) = await _customerService.ExportCustomersExcelAsync(
                q, createdFrom, createdTo);

            return File(bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName);
        }
    }
}
