namespace SaoKim_ecommerce_BE.DTOs
{
    public class ShippingFeeResultDto
    {
        public double DistanceKm { get; set; }
        public decimal Fee { get; set; }
    }

    public class ShippingDebugResultDto
    {
        public int AddressId { get; set; }
        public string Address { get; set; } = string.Empty;
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public double? DistanceKm { get; set; }
    }
}
