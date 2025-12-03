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

        [Range(0, double.MaxValue)]
        public decimal UnitPrice { get; set; }
    }

    public class CreateOrderRequest
    {
        public decimal Total { get; set; }

        public string? Status { get; set; }

        public string? PaymentMethod { get; set; }

        public string? ShippingMethod { get; set; }

        public string? Note { get; set; }

        // Danh sách sản phẩm trong đơn hàng
        [Required]
        [MinLength(1)]
        public List<CreateOrderItemRequest> Items { get; set; } = new();
    }
}
