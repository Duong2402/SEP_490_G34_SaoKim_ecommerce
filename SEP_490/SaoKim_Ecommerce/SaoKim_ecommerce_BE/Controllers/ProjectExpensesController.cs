using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/projects/{projectId:int}/expenses")]
    public class ProjectExpensesController : ControllerBase
    {
        private readonly IProjectExpenseService _service;
        public ProjectExpensesController(IProjectExpenseService service) => _service = service;

        // GET: api/projects/{projectId}/expenses
        [HttpGet]
        public async Task<IActionResult> Query([FromRoute] int projectId, [FromQuery] ProjectExpenseQuery q)
        {
            try
            {
                var res = await _service.QueryAsync(projectId, q);
                return Ok(ApiResponse<ProjectExpenseListResult>.Ok(res));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ApiResponse<string>.Fail("Project not found"));
            }
        }

        // GET: api/projects/{projectId}/expenses/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get([FromRoute] int projectId, [FromRoute] int id)
        {
            var res = await _service.GetAsync(projectId, id);
            if (res == null)
                return NotFound(ApiResponse<string>.Fail("Expense not found"));
            return Ok(ApiResponse<ProjectExpenseListItemDTO>.Ok(res));
        }

        // POST: api/projects/{projectId}/expenses
        [HttpPost]
        public async Task<IActionResult> Create([FromRoute] int projectId, [FromBody] ProjectExpenseCreateDTO dto)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                var createdBy = User?.Identity?.Name;
                var res = await _service.CreateAsync(projectId, dto, createdBy);
                return CreatedAtAction(nameof(Get),
                    new { projectId, id = res.Id },
                    ApiResponse<ProjectExpenseListItemDTO>.Ok(res));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
            catch (KeyNotFoundException)
            {
                return NotFound(ApiResponse<string>.Fail("Project not found"));
            }
        }

        // PUT: api/projects/{projectId}/expenses/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update([FromRoute] int projectId, int id, [FromBody] ProjectExpenseUpdateDTO dto)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                var updatedBy = User?.Identity?.Name;
                var res = await _service.UpdateAsync(projectId, id, dto, updatedBy);
                if (res == null)
                    return NotFound(ApiResponse<string>.Fail("Expense not found"));
                return Ok(ApiResponse<ProjectExpenseListItemDTO>.Ok(res, "Updated"));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<string>.Fail(ex.Message));
            }
        }

        // DELETE: api/projects/{projectId}/expenses/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete([FromRoute] int projectId, int id)
        {
            var ok = await _service.DeleteAsync(projectId, id);
            if (!ok)
                return NotFound(ApiResponse<string>.Fail("Expense not found"));
            return Ok(ApiResponse<string>.Ok("Deleted"));
        }
    }
}
