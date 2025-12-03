using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("product_details")]
    public class ProductDetail
    {
        [Key]
        [Column("id")]
        [Required]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("product_id")]
        [Required]
        public int ProductID { get; set; }

        [ForeignKey(nameof(ProductID))]
        public Product Product { get; set; } = null!;

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
