using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services;
using System.Security.Claims;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _service;
        public ProjectsController(IProjectService service) => _service = service;

        private static bool IsPm(string? role)
        {
            if (string.IsNullOrWhiteSpace(role)) return false;
            var r = role.Trim().ToLowerInvariant();
            return r == "project_manager" || r == "projectmanager" || r == "project manager" || r == "pm";
        }

        private static bool IsManager(string? role)
        {
            if (string.IsNullOrWhiteSpace(role)) return false;
            var r = role.Trim().ToLowerInvariant();
            return r == "manager" || r == "admin";
        }

        [HttpPost]
        [Authorize(Roles = "manager,admin")]
        public async Task<IActionResult> Create([FromBody] CreateProjectDTO dto)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            try
            {
                var createdBy = User?.Identity?.Name;
                var res = await _service.CreateAsync(dto, createdBy);
                return CreatedAtAction(
                    nameof(GetById),
                    new { id = res.Id },
                    ApiResponse<ProjectResponseDTO>.Ok(res, "Tạo dự án thành công"));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ApiResponse<string>.Fail(ex.Message));
            }
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var project = await _service.GetByIdAsync(id);
            if (project == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy dự án"));

            var role = User?.FindFirstValue(ClaimTypes.Role);
            var userIdStr = User?.FindFirstValue("UserId");

            if (IsPm(role))
            {
                if (!int.TryParse(userIdStr, out var userId))
                    return Forbid();

                if (!project.ProjectManagerId.HasValue || project.ProjectManagerId.Value != userId)
                    return Forbid();
            }

            return Ok(ApiResponse<ProjectResponseDTO>.Ok(project));
        }

        [HttpGet]
        public async Task<IActionResult> Query([FromQuery] ProjectQuery q)
        {
            var role = User?.FindFirstValue(ClaimTypes.Role);
            var userIdStr = User?.FindFirstValue("UserId");

            if (IsPm(role) && int.TryParse(userIdStr, out var userId))
            {
                q.ProjectManagerId = userId;
            }

            var res = await _service.QueryAsync(q);
            return Ok(ApiResponse<PagedResult<ProjectResponseDTO>>.Ok(res));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProjectDTO dto)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var role = User?.FindFirstValue(ClaimTypes.Role);
            var userIdStr = User?.FindFirstValue("UserId");

            var existing = await _service.GetByIdAsync(id);
            if (existing == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy dự án"));

            if (IsPm(role))
            {
                if (!int.TryParse(userIdStr, out var userId))
                    return Forbid();

                if (!existing.ProjectManagerId.HasValue || existing.ProjectManagerId.Value != userId)
                    return Forbid();

                dto.ProjectManagerId = existing.ProjectManagerId;
            }

            try
            {
                var res = await _service.UpdateAsync(id, dto, User?.Identity?.Name);
                if (res == null)
                    return NotFound(ApiResponse<string>.Fail("Không tìm thấy dự án"));

                return Ok(ApiResponse<ProjectResponseDTO>.Ok(res, "Cập nhật dự án thành công"));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        [HttpDelete("{id:int}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            var role = User?.FindFirstValue(ClaimTypes.Role);

            if (!IsManager(role))
                return Forbid();

            var ok = await _service.DeleteAsync(id);
            if (!ok)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy dự án"));

            return Ok(ApiResponse<string>.Ok("Xóa dự án thành công"));
        }

    }
}
