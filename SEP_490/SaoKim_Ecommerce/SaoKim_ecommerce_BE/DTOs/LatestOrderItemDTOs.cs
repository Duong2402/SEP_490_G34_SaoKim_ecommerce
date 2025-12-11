using System;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class LatestOrderItemDTOs
    {
        public int OrderId { get; set; }
        public decimal Total { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string CustomerName { get; set; } = string.Empty;
    }
}
