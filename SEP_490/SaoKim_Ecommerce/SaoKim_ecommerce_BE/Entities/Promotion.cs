using System;
using System.Collections.Generic;

namespace SaoKim_ecommerce_BE.Entities
{
    public enum DiscountType { Percentage = 1, FixedAmount = 2 }
    public enum PromotionStatus { Draft = 0, Scheduled = 1, Active = 2, Inactive = 3, Expired = 4 }

    public class Promotion
    {
        public int Id { get; set; }

        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string? LinkUrl { get; set; }
        public string? DescriptionHtml { get; set; }

        public DiscountType DiscountType { get; set; }
        public decimal DiscountValue { get; set; }

        public DateTimeOffset StartDate { get; set; }
        public DateTimeOffset EndDate { get; set; }

        public PromotionStatus Status { get; set; } = PromotionStatus.Draft;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }

        public ICollection<PromotionProduct> PromotionProducts { get; set; } = new List<PromotionProduct>();
    }
}