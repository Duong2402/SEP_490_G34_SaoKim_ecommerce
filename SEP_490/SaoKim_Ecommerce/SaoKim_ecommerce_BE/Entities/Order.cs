using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("orders")]
    public class Order
    {
        [Key]
        [Column("order_id")]
        public int OrderId { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public User Customer { get; set; } = null!;

        // ============== TIỀN HÀNG ==============

        /// <summary>
        /// Tổng tiền trước giảm giá.
        /// </summary>
        [Column("subtotal")]
        public decimal Subtotal { get; set; }

        /// <summary>
        /// Số tiền giảm từ coupon.
        /// </summary>
        [Column("discount_amount")]
        public decimal DiscountAmount { get; set; }

        /// <summary>
        /// Mã giảm giá áp dụng cho đơn (nếu có).
        /// </summary>
        [Column("coupon_code")]
        [MaxLength(64)]
        public string? CouponCode { get; set; }

        /// <summary>
        /// Tổng tiền sau giảm giá.
        /// </summary>
        [Column("total")]
        public decimal Total { get; set; }

        [Column("status")]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // ============== PAYMENT ==============

        [Column("paid_at")]
        public DateTime? PaidAt { get; set; }

        [Column("payment_method")]
        [MaxLength(50)]
        public string? PaymentMethod { get; set; }

        [Column("payment_status")]
        [MaxLength(50)]
        public string? PaymentStatus { get; set; }

        [Column("payment_transaction_code")]
        [MaxLength(100)]
        public string? PaymentTransactionCode { get; set; }

        // ============== SHIPPING SNAPSHOT ==============

        [Column("shipping_recipient_name")]
        [MaxLength(200)]
        public string? ShippingRecipientName { get; set; }

        [Column("shipping_phone_number")]
        [MaxLength(20)]
        public string? ShippingPhoneNumber { get; set; }

        [Column("shipping_line1")]
        [MaxLength(200)]
        public string? ShippingLine1 { get; set; }

        [Column("shipping_ward")]
        [MaxLength(100)]
        public string? ShippingWard { get; set; }

        [Column("shipping_district")]
        [MaxLength(100)]
        public string? ShippingDistrict { get; set; }

        [Column("shipping_province")]
        [MaxLength(100)]
        public string? ShippingProvince { get; set; }

        // ============== NAVIGATION ==============

        public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();

        public Invoice? Invoice { get; set; }
    }
}
