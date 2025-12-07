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
        public int? AddressId { get; set; }

        [Required]
        [StringLength(50)]
        public string PaymentMethod { get; set; } = "COD";
        [StringLength(100)]
        public string? PaymentTransactionCode { get; set; }

        [StringLength(64)]
        public string? CouponCode { get; set; }

        [StringLength(500)]
        public string? Note { get; set; }

        [Required]
        [MinLength(1)]
        public List<CreateOrderItemRequest> Items { get; set; } = new();
    }
}
