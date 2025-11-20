using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Collections.Generic;

using TaskStatusEnum = SaoKim_ecommerce_BE.Entities.TaskStatus;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class CreateProjectDTO
    {
        [MaxLength(50)] public string? Code { get; set; }   
        [Required, MaxLength(200)] public string Name { get; set; } = default!;
        [MaxLength(200)] public string? CustomerName { get; set; }
        [MaxLength(100)] public string? CustomerContact { get; set; }
        [MaxLength(50)] public string? Status { get; set; } = "Draft"; 
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        [Range(0, 1_000_000_000)] public decimal? Budget { get; set; }
        [MaxLength(2000)] public string? Description { get; set; }
    }

    public class UpdateProjectDTO
    {
        [Required, MaxLength(200)] public string Name { get; set; } = default!;
        [MaxLength(200)] public string? CustomerName { get; set; }
        [MaxLength(100)] public string? CustomerContact { get; set; }
        [MaxLength(50)] public string? Status { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        [Range(0, 1_000_000_000)] public decimal? Budget { get; set; }
        [MaxLength(2000)] public string? Description { get; set; }
    }

    public class ProjectResponseDTO
    {
        public int Id { get; set; }
        public string Code { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string? CustomerName { get; set; }
        public string? CustomerContact { get; set; }
        public string? Status { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal? Budget { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
    }

    public class ProjectQuery
    {
        public string? Keyword { get; set; }
        public string? Status { get; set; }    
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? Sort { get; set; } = "-CreatedAt"; 
    }

    public class ProjectPagedResult<T>
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public long Total { get; set; }
        public IEnumerable<T> Items { get; set; } = Array.Empty<T>();
    }

    public class TaskDayDTO
    {
        public DateTime Date { get; set; }
        public TaskStatusEnum Status { get; set; }  
    }

    public class TaskDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Assignee { get; set; }
        public DateTime StartDate { get; set; }
        public int DurationDays { get; set; }
        public int? DependsOnTaskId { get; set; }
        public IEnumerable<TaskDayDTO> Days { get; set; } = Array.Empty<TaskDayDTO>();
    }

    public class TaskCreateUpdateDTO
    {
        public string Name { get; set; } = string.Empty;
        public string? Assignee { get; set; }
        public DateTime StartDate { get; set; }
        public int DurationDays { get; set; } = 1;
        public int? DependsOnTaskId { get; set; }
        public IEnumerable<TaskDayDTO>? Days { get; set; }
    }
}
