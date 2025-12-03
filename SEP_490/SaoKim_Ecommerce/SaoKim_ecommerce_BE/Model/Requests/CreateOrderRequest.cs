using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SaoKim_ecommerce_BE.Models.Requests
{
    public class CreateOrderItemRequest
    {
        [Required]
        public int ProductId { get; set; }

        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }

    public class CreateOrderRequest
    {
        public decimal Subtotal { get; set; }

        [Required]
        public int AddressId { get; set; }

        public string? Status { get; set; }
        public string? PaymentMethod { get; set; }
        public string? ShippingMethod { get; set; }
        public string? Note { get; set; }

        [Required]
        public List<CreateOrderItemRequest> Items { get; set; } = new();
    }
}
