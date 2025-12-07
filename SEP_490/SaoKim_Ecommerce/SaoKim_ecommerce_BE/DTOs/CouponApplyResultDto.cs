using System;

namespace SaoKim_ecommerce_BE.DTOs
{
    /// <summary>
    /// Kết quả validate + tính toán mã giảm giá cho đơn hàng.
    /// Dùng chung cho bước checkout (FE) và khi tạo Order (BE).
    /// </summary>
    public class CouponApplyResultDto
    {
        public bool IsValid { get; set; }

        public string Message { get; set; } = string.Empty;

        public int CouponId { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string DiscountType { get; set; } = string.Empty; // Percentage / Fixed

        public decimal DiscountValue { get; set; }

        /// <summary>
        /// Số tiền giảm.
        /// </summary>
        public decimal DiscountAmount { get; set; }

        /// <summary>
        /// Tổng tiền sau khi giảm.
        /// </summary>
        public decimal FinalTotal { get; set; }
    }
}
