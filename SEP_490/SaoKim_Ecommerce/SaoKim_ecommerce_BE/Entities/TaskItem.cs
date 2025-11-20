using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    public class TaskItem
    {
        [Key] public int Id { get; set; }
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        [MaxLength(150)]
        public string? Assignee { get; set; }
        public DateTime StartDate { get; set; }
        public int DurationDays { get; set; } = 1;
        public int ProjectId { get; set; }
        public Project Project { get; set; } = null!;
        public int? DependsOnTaskId { get; set; }
        [ForeignKey(nameof(DependsOnTaskId))]
        public TaskItem? DependsOn { get; set; }
        public ICollection<TaskDay> Days { get; set; } = new List<TaskDay>();
    }
}
