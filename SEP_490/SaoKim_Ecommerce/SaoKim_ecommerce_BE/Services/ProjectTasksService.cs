using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services
{
    public class ProjectTasksService : IProjectTasksService
    {
        private readonly SaoKimDBContext _db;

        public ProjectTasksService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<TaskDTO>> GetTasksAsync(int projectId)
        {
            var exist = await _db.Projects.AnyAsync(p => p.Id == projectId);
            if (!exist)
                throw new KeyNotFoundException("Không tìm thấy dự án");

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
                    Days = t.Days.Select(d => new TaskDayDTO
                    {
                        Date = d.Date,
                        Status = d.Status
                    })
                })
                .ToListAsync();

            return items;
        }

        public async Task<TaskDTO?> GetTaskByIdAsync(int projectId, int taskId)
        {
            var t = await _db.TaskItems
                .AsNoTracking()
                .Include(x => x.Days)
                .FirstOrDefaultAsync(x => x.Id == taskId && x.ProjectId == projectId);

            if (t == null)
                return null;

            return new TaskDTO
            {
                Id = t.Id,
                Name = t.Name,
                Assignee = t.Assignee,
                StartDate = t.StartDate,
                DurationDays = t.DurationDays,
                DependsOnTaskId = t.DependsOnTaskId,
                Days = t.Days.Select(d => new TaskDayDTO
                {
                    Date = d.Date,
                    Status = d.Status
                })
            };
        }

        public async Task<TaskDTO> CreateTaskAsync(int projectId, TaskCreateUpdateDTO dto)
        {
            var projectExists = await _db.Projects.AnyAsync(p => p.Id == projectId);
            if (!projectExists)
                throw new KeyNotFoundException("Không tìm thấy dự án");

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

            return new TaskDTO
            {
                Id = task.Id,
                Name = task.Name,
                Assignee = task.Assignee,
                StartDate = task.StartDate,
                DurationDays = task.DurationDays,
                DependsOnTaskId = task.DependsOnTaskId,
                Days = task.Days.Select(d => new TaskDayDTO
                {
                    Date = d.Date,
                    Status = d.Status
                })
            };
        }

        public async Task<bool> UpdateTaskAsync(int projectId, int taskId, TaskCreateUpdateDTO dto)
        {
            var task = await _db.TaskItems
                .Include(t => t.Days)
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == projectId);

            if (task == null)
                return false;

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
            return true;
        }

        public async Task<bool> DeleteTaskAsync(int projectId, int taskId)
        {
            var task = await _db.TaskItems
                .FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == projectId);

            if (task == null)
                return false;

            _db.TaskItems.Remove(task);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
