using System;

namespace SaoKim_ecommerce_BE.Entities
{
    public class Coupon
    {
        public int Id { get; set; }
        public string Code { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public string DiscountType { get; set; } = "Percentage";
        public decimal DiscountValue { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public int? MaxUsage { get; set; }          
        public int? PerUserLimit { get; set; }
        public DateTimeOffset? StartDate { get; set; }
        public DateTimeOffset? EndDate { get; set; }
        public string Status { get; set; } = "Draft";
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public int TotalRedeemed { get; set; } = 0;
    }
}
