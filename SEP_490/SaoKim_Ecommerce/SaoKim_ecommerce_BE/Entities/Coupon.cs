using System;

namespace SaoKim_ecommerce_BE.Entities
{
    public class Coupon
    {
        public int Id { get; set; }

        public string Code { get; set; } = default!;  // unique
        public string Name { get; set; } = default!;
        public string? Description { get; set; }

        // Discount
        public string DiscountType { get; set; } = "Percentage"; // Percentage | FixedAmount
        public decimal DiscountValue { get; set; }                // % hoặc số tiền

        // Conditions
        public decimal? MinOrderAmount { get; set; }
        public int? MaxUsage { get; set; }          // tổng số lần có thể dùng
        public int? PerUserLimit { get; set; }      // số lần / user (nếu có user system)

        // Lifetime
        public DateTimeOffset? StartDate { get; set; }
        public DateTimeOffset? EndDate { get; set; }

        // Status: Draft | Scheduled | Active | Inactive | Expired
        public string Status { get; set; } = "Draft";

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Optional stats
        public int TotalRedeemed { get; set; } = 0;
    }
}
