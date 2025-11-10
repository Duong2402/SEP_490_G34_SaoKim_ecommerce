using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _service;
        public ProjectsController(IProjectService service) => _service = service;

        // [Authorize(Roles="PM")] // bật khi có auth
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateProjectDTO dto)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            try
            {
                var createdBy = User?.Identity?.Name;
                var res = await _service.CreateAsync(dto, createdBy);
                return CreatedAtAction(nameof(GetById), new { id = res.Id }, ApiResponse<ProjectResponseDTO>.Ok(res));
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
            var res = await _service.GetByIdAsync(id);
            if (res == null) return NotFound(ApiResponse<string>.Fail("Project not found"));
            return Ok(ApiResponse<ProjectResponseDTO>.Ok(res));
        }

        [HttpGet]
        public async Task<IActionResult> Query([FromQuery] ProjectQuery q)
        {
            var res = await _service.QueryAsync(q);
            return Ok(ApiResponse<PagedResult<ProjectResponseDTO>>.Ok(res));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProjectDTO dto)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            try
            {
                var res = await _service.UpdateAsync(id, dto, User?.Identity?.Name);
                if (res == null) return NotFound(ApiResponse<string>.Fail("Project not found"));
                return Ok(ApiResponse<ProjectResponseDTO>.Ok(res, "Updated"));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var ok = await _service.DeleteAsync(id);
            if (!ok) return NotFound(ApiResponse<string>.Fail("Project not found"));
            return Ok(ApiResponse<string>.Ok("Deleted"));
        }
    }
}
