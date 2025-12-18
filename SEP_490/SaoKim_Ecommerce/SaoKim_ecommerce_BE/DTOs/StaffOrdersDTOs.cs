using System;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class StaffOrderListItemDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? CustomerPhone { get; set; }
        public decimal Total { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? PaymentMethod { get; set; }
        public bool HasInvoice { get; set; }
        public int? InvoiceId { get; set; }
        public bool DispatchConfirmed { get; set; }
    }

    public class StaffOrderPaymentDto
    {
        public string? Method { get; set; }
        public string? Status { get; set; }
        public string? TransactionCode { get; set; }
        public DateTime? PaidAt { get; set; }
    }

    public class StaffOrderInvoiceSummaryDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public decimal Total { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class StaffOrderItemDto
    {
        public int OrderItemId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? ProductCode { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
    }

    public class StaffOrderDetailDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public decimal Total { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }

        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal ShippingFee { get; set; }
        public decimal VatAmount { get; set; }

        public int CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? CustomerPhone { get; set; }

        public StaffOrderPaymentDto Payment { get; set; } = new();
        public StaffOrderInvoiceSummaryDto? Invoice { get; set; }

        public string? ShippingRecipientName { get; set; }
        public string? ShippingPhoneNumber { get; set; }
        public string? ShippingLine1 { get; set; }
        public string? ShippingWard { get; set; }
        public string? ShippingDistrict { get; set; }
        public string? ShippingProvince { get; set; }
        public string? CustomerMessage { get; set; }

        public List<StaffOrderItemDto> Items { get; set; } = new();
    }
}
