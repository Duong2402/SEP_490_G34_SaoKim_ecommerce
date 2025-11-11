using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("products")]
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

        [Column("category_id")]
        public int? CategoryId { get; set; }
        public Category? Category { get; set; }

        [Column("unit")]
        [MaxLength(50)]
        public string? Unit { get; set; }

        [Column("price", TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        [Column("quantity")]
        public int Quantity { get; set; }

        [Column("stock")]
        public int Stock { get; set; }

        [Column("status")]
        [MaxLength(50)]
        public string? Status { get; set; }

        [MaxLength(300)]
        [Column("image")]
        public string? Image { get; set; }

        [Column("description")]
        [MaxLength(500)]
        public string? Description { get; set; }

        [Column("supplier")]
        [MaxLength(200)]
        public string? Supplier { get; set; }

        [Column("note")]
        [MaxLength(500)]
        public string? Note { get; set; }

        [Column("created")]
        public DateTime? Created { get; set; } = DateTime.UtcNow;

        [Column("date")]
        public DateTime Date { get; set; } = DateTime.UtcNow;

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