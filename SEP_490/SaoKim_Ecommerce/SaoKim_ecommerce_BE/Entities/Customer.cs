using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    // ===== CUSTOMER NOTE =====
    [Table("customer_notes")]
    public class CustomerNote
    {
        [Key]
        [Column("note_id")]
        public int NoteId { get; set; }

        [Column("customer_id")]
        public int CustomerId { get; set; }

        [ForeignKey(nameof(CustomerId))]
        public User Customer { get; set; } = null!;

        [Column("staff_id")]
        public int StaffId { get; set; }

        [ForeignKey(nameof(StaffId))]
        public User Staff { get; set; } = null!;

        [Column("content")]
        [MaxLength(1000)]
        public string Content { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    // ===== STAFF ACTION LOG =====
    [Table("staff_action_logs")]
    public class StaffActionLog
    {
        [Key]
        [Column("log_id")]
        public int LogId { get; set; }

        [Column("staff_id")]
        public int StaffId { get; set; }

        [ForeignKey(nameof(StaffId))]
        public User Staff { get; set; } = null!;

        [Column("action")]
        [MaxLength(200)]
        public string Action { get; set; } = string.Empty;

        [Column("payload_json")]
        public string? PayloadJson { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    // ===== ORDER =====
    [Table("orders")]
    public class Order
    {
        [Key]
        [Column("order_id")]
        public int OrderId { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public User Customer { get; set; } = null!;

        [Column("total")]
        public decimal Total { get; set; }

        [Column("status")]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
