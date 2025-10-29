using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    public class Product
    {
        [Key]
        [Column("product_id")]
        [Required]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ProductID { get; set; }

        [Column("product_name")]
        [Required, MaxLength(200)]
        public string ProductName { get; set; } = string.Empty;

        [Column("product_code")]
        [Required, MaxLength(50)]
        public string ProductCode { get; set; } = string.Empty;

        [Column("unit")]
        [MaxLength(50)]
        public string? Unit { get; set; }

        [Column("description")]
        [MaxLength(500)]
        public string? Description { get; set; }

        [Column("supplier")]
        [MaxLength(200)]
        public string? Supplier { get; set; }

        [Column("quantity")]
        public int Quantity { get; set; }

        [MaxLength(300)]
        [Column("image")]
        public string? Image { get; set; }


        [Column("price", TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        [Column("date")]
        public DateTime Date { get; set; } = DateTime.UtcNow;

        [Column("note")]
        [MaxLength(500)]
        public string? Note { get; set; }

        [Column("category")]
        [MaxLength(100)]
        public string? Category { get; set; }

        [Column("status")]
        [MaxLength(50)]
        public string? Status { get; set; }

        [Column("create_at")]
        public DateTime? CreateAt { get; set; } = DateTime.UtcNow;

        [Column("create_by")]
        [MaxLength(100)]
        public string? CreateBy { get; set; }

        [Column("update_by")]
        [MaxLength(100)]
        public string? UpdateBy { get; set; }

        [Column("update_at")]
        public DateTime? UpdateAt { get; set; }
    }
}
