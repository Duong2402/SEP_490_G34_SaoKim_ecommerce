using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("project_expenses")]
    public class ProjectExpense
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProjectId { get; set; }

        [Required]
        public DateTime Date { get; set; }   // timestamp with time zone in DB

        [MaxLength(100)]
        public string? Category { get; set; }

        [MaxLength(300)]
        public string? Vendor { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        [Column(TypeName = "numeric(18,2)")]
        [Range(0, 1_000_000_000)]
        public decimal Amount { get; set; }

        [MaxLength(300)]
        public string? ReceiptUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // optional navigation
        public Project? Project { get; set; }
    }
}
