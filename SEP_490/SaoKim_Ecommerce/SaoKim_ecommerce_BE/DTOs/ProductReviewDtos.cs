using System;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class ProductReviewListItemDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ProductReviewSummaryDto
    {
        public List<ProductReviewListItemDto> Items { get; set; } = new();
        public double AverageRating { get; set; }
        public int Count { get; set; }
    }

    public class WriteReviewRequestDto
    {
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }
}
