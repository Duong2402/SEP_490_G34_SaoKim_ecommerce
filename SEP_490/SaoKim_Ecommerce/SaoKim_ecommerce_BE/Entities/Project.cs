using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    public class Project
    {
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string Code { get; set; } = default!;

        [Required, MaxLength(200)]
        public string Name { get; set; } = default!;

        [MaxLength(200)]
        public string? CustomerName { get; set; }

        [MaxLength(100)]
        public string? CustomerContact { get; set; }

        [MaxLength(50)]
        public string? Status { get; set; } = "Draft";

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public decimal? Budget { get; set; }

        [MaxLength(2000)]
        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? CreatedBy { get; set; }

        // NEW: gán PM cho project
        public int? ProjectManagerId { get; set; }

        [ForeignKey(nameof(ProjectManagerId))]
        public User? ProjectManager { get; set; }

        public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();

        public ICollection<ProjectProduct> ProjectProducts { get; set; } = new List<ProjectProduct>();
    }
}
