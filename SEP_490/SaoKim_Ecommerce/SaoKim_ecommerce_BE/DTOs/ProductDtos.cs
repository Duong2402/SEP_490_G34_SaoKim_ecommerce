<<<<<<< HEAD
﻿using Microsoft.AspNetCore.Http;

namespace SaoKim_ecommerce_BE.DTOs
=======
﻿namespace SaoKim_ecommerce_BE.DTOs
>>>>>>> origin/main
{
    public class ProductListItemDto
    {
        public int Id { get; set; }

        public string Sku { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Slug { get; set; }
        public string? Category { get; set; }

        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public int Stock { get; set; }
        public bool InStock => Stock > 0;

        public string? ThumbnailUrl { get; set; }
        public string? Status { get; set; }

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

    // CREATE DTO dùng [FromForm] để nhận cả file ảnh
    public class CreateProductDto
    {
<<<<<<< HEAD
        public string Sku { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;

        // CategoryId đúng với entity Product
        public int? CategoryId { get; set; }

=======
        public string Sku { get; set; } = string.Empty;   
        public string Name { get; set; } = string.Empty;  
        public string? Category { get; set; }
>>>>>>> origin/main
        public string? Unit { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public int Stock { get; set; }

        public bool Active { get; set; } = true;
        public string? Description { get; set; }
        public string? Supplier { get; set; }

        // Không dùng string Image nữa
        public string? Note { get; set; }

        // Nhận file upload
        public IFormFile? ImageFile { get; set; }
    }

    public class UpdateProductDto : CreateProductDto
    {
        public string? UpdateBy { get; set; }
    }
}
