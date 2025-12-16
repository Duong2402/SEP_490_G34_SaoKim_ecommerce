using System;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class OrderCreateResultDto
    {
        public int OrderId { get; set; }
        public decimal Subtotal { get; set; }
        public decimal ShippingFee { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal VatAmount { get; set; }
        public decimal Total { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class MyOrderListItemDto
    {
        public int OrderId { get; set; }
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal ShippingFee { get; set; }
        public decimal VatAmount { get; set; }
        public decimal Total { get; set; }
        public string? CouponCode { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? PaymentStatus { get; set; }
        public string? PaymentMethod { get; set; }
        public string? ShippingRecipientName { get; set; }
    }
}
