using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/projects/{projectId:int}/tasks")]
    public class ProjectTasksController : ControllerBase
    {
        private readonly IProjectTasksService _svc;

        public ProjectTasksController(IProjectTasksService svc)
        {
            _svc = svc;
        }

        // GET: /api/projects/{projectId}/tasks
        [HttpGet]
        public async Task<IActionResult> GetTasks(int projectId)
        {
            try
            {
                var items = await _svc.GetTasksAsync(projectId);
                return Ok(ApiResponse<IEnumerable<TaskDTO>>.Ok(items));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<string>.Fail(ex.Message));
            }
        }

        // GET: /api/projects/{projectId}/tasks/{taskId}
        [HttpGet("{taskId:int}")]
        public async Task<IActionResult> GetTaskById(int projectId, int taskId)
        {
            var dto = await _svc.GetTaskByIdAsync(projectId, taskId);
            if (dto == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy công việc"));

            return Ok(ApiResponse<TaskDTO>.Ok(dto));
        }

        // POST: /api/projects/{projectId}/tasks
        [HttpPost]
        public async Task<IActionResult> Create(int projectId, [FromBody] TaskCreateUpdateDTO dto)
        {
            try
            {
                var created = await _svc.CreateTaskAsync(projectId, dto);
                return CreatedAtAction(
                    nameof(GetTaskById),
                    new { projectId, taskId = created.Id },
                    ApiResponse<TaskDTO>.Ok(created));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<string>.Fail(ex.Message));
            }
        }

        // PUT: /api/projects/{projectId}/tasks/{taskId}
        [HttpPut("{taskId:int}")]
        public async Task<IActionResult> Update(int projectId, int taskId, [FromBody] TaskCreateUpdateDTO dto)
        {
            var ok = await _svc.UpdateTaskAsync(projectId, taskId, dto);
            if (!ok)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy công việc"));

            return Ok(ApiResponse<string>.Ok("Cập nhật thành công"));
        }

        // DELETE: /api/projects/{projectId}/tasks/{taskId}
        [HttpDelete("{taskId:int}")]
        public async Task<IActionResult> Delete(int projectId, int taskId)
        {
            var ok = await _svc.DeleteTaskAsync(projectId, taskId);
            if (!ok)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy công việc"));

            return Ok(ApiResponse<string>.Ok("Xóa thành công"));
        }
    }
}
