using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("Products")]
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
        public string ProductCode { get; set; } = string.Empty; // SKU hoặc mã sản phẩm

        [Column("category")]
        [MaxLength(100)]
        public string? Category { get; set; }  // Loại sản phẩm (Bóng đèn, Công tắc,...)

        [Column("unit")]
        [MaxLength(50)]
        public string? Unit { get; set; }      // Đơn vị tính (cái, hộp,...)

        [Column("price", TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }     // Giá bán

        [Column("quantity")]
        public int Quantity { get; set; }      // Số lượng trong kho

        [Column("stock")]
        public int Stock { get; set; }         // Số lượng tồn (nếu bạn cần tách riêng giữa tồn kho & số lượng nhập)

        [Column("status")]
        [MaxLength(50)]
        public string? Status { get; set; }    // Trạng thái (Active / Inactive)

        [MaxLength(300)]
        [Column("image")]
        public string? Image { get; set; }     // Đường dẫn ảnh sản phẩm

        [Column("description")]
        [MaxLength(500)]
        public string? Description { get; set; } // Mô tả sản phẩm

        [Column("supplier")]
        [MaxLength(200)]
        public string? Supplier { get; set; }  // Nhà cung cấp

        [Column("note")]
        [MaxLength(500)]
        public string? Note { get; set; }      // Ghi chú

        [Column("created")]
        public DateTime? Created { get; set; } = DateTime.UtcNow; // Ngày tạo hiển thị trong UI

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