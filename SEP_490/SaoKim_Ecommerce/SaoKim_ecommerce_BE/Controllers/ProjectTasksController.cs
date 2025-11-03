using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models;

// alias enum để gọn
using TaskStatusEnum = SaoKim_ecommerce_BE.Entities.TaskStatus;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/projects/{projectId:int}/tasks")]
    public class ProjectTasksController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        public ProjectTasksController(SaoKimDBContext db) => _db = db;

        // GET: /api/projects/{projectId}/tasks
        [HttpGet]
        public async Task<IActionResult> GetTasks(int projectId)
        {
            var exist = await _db.Projects.AnyAsync(p => p.Id == projectId);
            if (!exist) return NotFound(ApiResponse<string>.Fail("Project not found"));

            var items = await _db.TaskItems
                .AsNoTracking()
                .Where(t => t.ProjectId == projectId)
                .Include(t => t.Days)
                .OrderBy(t => t.StartDate)
                .Select(t => new TaskDTO
                {
                    Id = t.Id,
                    Name = t.Name,
                    Assignee = t.Assignee,
                    StartDate = t.StartDate,
                    DurationDays = t.DurationDays,
                    DependsOnTaskId = t.DependsOnTaskId,
                    Days = t.Days.Select(d => new TaskDayDTO { Date = d.Date, Status = d.Status })
                })
                .ToListAsync();

            return Ok(ApiResponse<IEnumerable<TaskDTO>>.Ok(items));
        }

        // GET: /api/projects/{projectId}/tasks/{taskId}
        [HttpGet("{taskId:int}")]
        public async Task<IActionResult> GetTaskById(int projectId, int taskId)
        {
            var t = await _db.TaskItems
                .AsNoTracking()
                .Include(x => x.Days)
                .FirstOrDefaultAsync(x => x.Id == taskId && x.ProjectId == projectId);

            if (t == null) return NotFound(ApiResponse<string>.Fail("Task not found"));

            var dto = new TaskDTO
            {
                Id = t.Id,
                Name = t.Name,
                Assignee = t.Assignee,
                StartDate = t.StartDate,
                DurationDays = t.DurationDays,
                DependsOnTaskId = t.DependsOnTaskId,
                Days = t.Days.Select(d => new TaskDayDTO { Date = d.Date, Status = d.Status })
            };
            return Ok(ApiResponse<TaskDTO>.Ok(dto));
        }

        // POST: /api/projects/{projectId}/tasks
        [HttpPost]
        public async Task<IActionResult> Create(int projectId, [FromBody] TaskCreateUpdateDTO dto)
        {
            if (!await _db.Projects.AnyAsync(p => p.Id == projectId))
                return NotFound(ApiResponse<string>.Fail("Project not found"));

            var task = new TaskItem
            {
                ProjectId = projectId,
                Name = dto.Name,
                Assignee = dto.Assignee,
                StartDate = dto.StartDate.Date,
                DurationDays = Math.Max(1, dto.DurationDays),
                DependsOnTaskId = dto.DependsOnTaskId
            };

            if (dto.Days != null)
            {
                foreach (var d in dto.Days)
                {
                    task.Days.Add(new TaskDay
                    {
                        Date = d.Date.Date,
                        Status = d.Status
                    });
                }
            }

            _db.TaskItems.Add(task);
            await _db.SaveChangesAsync();

            var res = new TaskDTO
            {
                Id = task.Id,
                Name = task.Name,
                Assignee = task.Assignee,
                StartDate = task.StartDate,
                DurationDays = task.DurationDays,
                DependsOnTaskId = task.DependsOnTaskId,
                Days = task.Days.Select(d => new TaskDayDTO { Date = d.Date, Status = d.Status })
            };
            return CreatedAtAction(nameof(GetTaskById), new { projectId, taskId = task.Id }, ApiResponse<TaskDTO>.Ok(res));
        }

        // PUT: /api/projects/{projectId}/tasks/{taskId}
        [HttpPut("{taskId:int}")]
        public async Task<IActionResult> Update(int projectId, int taskId, [FromBody] TaskCreateUpdateDTO dto)
        {
            var task = await _db.TaskItems.Include(t => t.Days)
                           .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == projectId);
            if (task == null) return NotFound(ApiResponse<string>.Fail("Task not found"));

            task.Name = dto.Name;
            task.Assignee = dto.Assignee;
            task.StartDate = dto.StartDate.Date;
            task.DurationDays = Math.Max(1, dto.DurationDays);
            task.DependsOnTaskId = dto.DependsOnTaskId;

            if (dto.Days != null)
            {
                _db.TaskDays.RemoveRange(task.Days);
                task.Days = dto.Days.Select(d => new TaskDay
                {
                    TaskItemId = task.Id,
                    Date = d.Date.Date,
                    Status = d.Status
                }).ToList();
            }

            await _db.SaveChangesAsync();
            return Ok(ApiResponse<string>.Ok("Updated"));
        }

        // DELETE: /api/projects/{projectId}/tasks/{taskId}
        [HttpDelete("{taskId:int}")]
        public async Task<IActionResult> Delete(int projectId, int taskId)
        {
            var task = await _db.TaskItems.FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == projectId);
            if (task == null) return NotFound(ApiResponse<string>.Fail("Task not found"));

            _db.TaskItems.Remove(task);
            await _db.SaveChangesAsync();
            return Ok(ApiResponse<string>.Ok("Deleted"));
        }
    }
}
