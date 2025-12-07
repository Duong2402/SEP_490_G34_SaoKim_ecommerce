using System;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class CouponApplyResultDto
    {
        public bool IsValid { get; set; }

        public string Message { get; set; } = string.Empty;

        public int CouponId { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string DiscountType { get; set; } = string.Empty; 

        public decimal DiscountValue { get; set; }

        public decimal DiscountAmount { get; set; }

        public decimal FinalTotal { get; set; }
    }
}
