namespace SaoKim_ecommerce_BE.Models.Requests
{
    public class CreateAddressRequest
    {
        public string RecipientName { get; set; } = "";
        public string PhoneNumber { get; set; } = "";
        public string Line1 { get; set; } = "";
        public string? Ward { get; set; }
        public string? District { get; set; }
        public string? Province { get; set; }
        public bool IsDefault { get; set; }

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
}
