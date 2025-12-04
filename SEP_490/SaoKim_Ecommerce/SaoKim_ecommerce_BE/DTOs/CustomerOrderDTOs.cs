using System;
using System.Collections.Generic;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class CustomerOrderItemDto
    {
        public int OrderItemId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ProductCode { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public string? Unit { get; set; }

        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
    }

    public class CustomerOrderAddressDto
    {
        public string? RecipientName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Line1 { get; set; }
        public string? Ward { get; set; }
        public string? District { get; set; }
        public string? Province { get; set; }
    }

    public class CustomerOrderPaymentDto
    {
        public string? Method { get; set; }          // COD / BANK_TRANSFER_QR
        public string? Status { get; set; }          // PENDING / PAID / ...
        public DateTime? PaidAt { get; set; }
        public string? TransactionCode { get; set; }
    }

    public class CustomerOrderInvoiceDto
    {
        public int? InvoiceId { get; set; }
        public string? Code { get; set; }
        public decimal? Subtotal { get; set; }
        public decimal? Discount { get; set; }
        public decimal? Tax { get; set; }
        public decimal? Total { get; set; }
    }

    public class CustomerOrderDetailDto
    {
        public int OrderId { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal Total { get; set; }

        public CustomerOrderAddressDto? ShippingAddress { get; set; }
        public CustomerOrderPaymentDto? Payment { get; set; }

        public List<CustomerOrderItemDto> Items { get; set; } = new();
        public CustomerOrderInvoiceDto? Invoice { get; set; }
    }
}
