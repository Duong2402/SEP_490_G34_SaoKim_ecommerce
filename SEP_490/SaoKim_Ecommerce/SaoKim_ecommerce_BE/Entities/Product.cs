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
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ProductID { get; set; }

        [Column("product_name")]
        [Required, MaxLength(200)]
        public string ProductName { get; set; } = string.Empty;

        [Column("product_code")]
        [Required, MaxLength(50)]
        public string ProductCode { get; set; } = string.Empty;

        public ICollection<ProductDetail> ProductDetails { get; set; } = new List<ProductDetail>();

        // navigation sang project_products để biết sản phẩm đang được dùng trong dự án nào
        public ICollection<ProjectProduct> ProjectProducts { get; set; } = new List<ProjectProduct>();
    }
}