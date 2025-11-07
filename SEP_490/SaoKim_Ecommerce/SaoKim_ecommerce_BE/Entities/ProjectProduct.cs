using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("project_products")]
    public class ProjectProduct
    {
        public int Id { get; set; }

        [Required]
        public int ProjectId { get; set; }

        [Required]
        public int ProductId { get; set; }

        // chốt thông tin tại thời điểm thêm, tránh lệ thuộc thay đổi ở bảng products
        [Required, MaxLength(200)]
        public string ProductName { get; set; } = default!;

        [Required, MaxLength(50)]
        public string Uom { get; set; } = "pcs";

        [Range(0.0001, double.MaxValue)]
        [Column(TypeName = "numeric(18,3)")]
        public decimal Quantity { get; set; }

        [Range(0, double.MaxValue)]
        [Column(TypeName = "numeric(18,2)")]
        public decimal UnitPrice { get; set; }

        [Range(0, double.MaxValue)]
        [Column(TypeName = "numeric(18,2)")]
        public decimal Total { get; set; }

        [MaxLength(500)]
        public string? Note { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navs
        public Project Project { get; set; } = default!;
        public Product Product { get; set; } = default!;
    }
}
