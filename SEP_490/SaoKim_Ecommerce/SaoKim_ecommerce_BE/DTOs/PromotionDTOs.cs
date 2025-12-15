using System;
using System.Collections.Generic;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class PromotionListItemDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Status { get; set; } = "Draft";
        public DateTimeOffset StartDate { get; set; }
        public DateTimeOffset EndDate { get; set; }
        public decimal DiscountValue { get; set; }
        public string DiscountType { get; set; } = "Percentage";
        public DateTimeOffset CreatedAt { get; set; }

        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string? LinkUrl { get; set; }
        public string? DescriptionHtml { get; set; }
    }

    public class PromotionProductItemDto
    {
        public int Id { get; set; }

        public int ProductId { get; set; }
        public string ProductName { get; set; } = null!;
        public string ProductCode { get; set; } = null!;

        public string? Note { get; set; }
    }

    public class PromotionDetailDto : PromotionListItemDto
    {
        public List<PromotionProductItemDto> Products { get; set; } = new List<PromotionProductItemDto>();
    }

    public class PromotionCreateDto
    {
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string DiscountType { get; set; } = "Percentage";
        public decimal DiscountValue { get; set; }
        public DateTimeOffset StartDate { get; set; }
        public DateTimeOffset EndDate { get; set; }
        public string Status { get; set; } = "Draft";

        public List<int>? ProductIds { get; set; }

        // Multimedia & rich-text
        public string? ImageUrl { get; set; }
        public string? LinkUrl { get; set; }
        public string? DescriptionHtml { get; set; }
    }

    public class PromotionUpdateDto : PromotionCreateDto
    {
    }
}
