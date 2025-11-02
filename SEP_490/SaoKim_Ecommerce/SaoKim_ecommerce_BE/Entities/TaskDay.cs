using System.ComponentModel.DataAnnotations;

namespace SaoKim_ecommerce_BE.Entities
{
    public class TaskDay
    {
        [Key] public int Id { get; set; }

        public int TaskItemId { get; set; }
        public TaskItem TaskItem { get; set; } = null!;

        public DateTime Date { get; set; }                 // chỉ lấy phần ngày
        public TaskStatus Status { get; set; }
    }
}
