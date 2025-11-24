using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("orders")]
    public class Order
    {
        [Key]
        [Column("order_id")]
        public int OrderId { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        // Navigation tới User (customer)
        [ForeignKey(nameof(UserId))]
        public User Customer { get; set; } = null!;

        [Column("total")]
        public decimal Total { get; set; }

        [Column("status")]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation tới danh sách OrderItem
        public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();

        // 1–1: mỗi Order có tối đa 1 Invoice
        public Invoice? Invoice { get; set; }
    }
}
