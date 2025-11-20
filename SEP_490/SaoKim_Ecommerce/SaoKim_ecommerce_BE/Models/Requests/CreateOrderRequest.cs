namespace SaoKim_ecommerce_BE.Models.Requests
{
    public class CreateOrderRequest
    {
        public decimal Total { get; set; }
        public string? Status { get; set; }
        public string? PaymentMethod { get; set; }
        public string? ShippingMethod { get; set; }
        public string? Note { get; set; }
    }
}