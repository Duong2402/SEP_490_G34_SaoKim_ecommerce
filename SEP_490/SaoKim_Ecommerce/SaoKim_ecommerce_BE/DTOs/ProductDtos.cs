using Microsoft.AspNetCore.Http;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class ProductListItemDto
    {
        public int Id { get; set; }

        public string Sku { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Slug { get; set; }
        public string? Category { get; set; }
        public string? Unit { get; set; }

        // Price sẽ là "giá cuối" (đã áp khuyến mãi nếu có)
        public decimal Price { get; set; }

        // Giá gốc để FE gạch (nullable để không phá UI cũ)
        public decimal? OriginalPrice { get; set; }

        // Thông tin khuyến mãi đang áp dụng (nullable)
        public int? AppliedPromotionId { get; set; }
        public string? AppliedPromotionName { get; set; }
        public string? AppliedDiscountType { get; set; }   // "Percentage" | "FixedAmount"
        public decimal? AppliedDiscountValue { get; set; }

        public int Quantity { get; set; }
        public int Stock { get; set; }
        public bool InStock => Stock > 0;

        public string? ThumbnailUrl { get; set; }
        public string? Status { get; set; }

        // Dùng cho homepage (trước controller có trả)
        public string? Description { get; set; }

        public DateTime? CreatedAt { get; set; }
    }

    public class ProductDetailDto : ProductListItemDto
    {
        public string? Unit { get; set; }
        public string? Description { get; set; }
        public string? Supplier { get; set; }
        public string? Image { get; set; }
        public string? Note { get; set; }
        public DateTime Date { get; set; }
        public DateTime? CreateAt { get; set; }
        public string? CreateBy { get; set; }
        public string? UpdateBy { get; set; }
        public DateTime? UpdateAt { get; set; }
    }

    public class CreateProductDto
    {
        public string Name { get; set; } = string.Empty;
        public int? CategoryId { get; set; }

        public string? Unit { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public int Stock { get; set; }

        public bool Active { get; set; } = true;
        public string? Description { get; set; }
        public string? Supplier { get; set; }
        public string? Note { get; set; }
        public IFormFile? ImageFile { get; set; }
    }

    public class UpdateProductDto : CreateProductDto
    {
        public string? UpdateBy { get; set; }
    }

    public class UpdateProductStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}
