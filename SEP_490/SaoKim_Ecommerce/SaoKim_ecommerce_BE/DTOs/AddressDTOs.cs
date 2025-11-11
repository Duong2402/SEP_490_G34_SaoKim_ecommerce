using System.ComponentModel.DataAnnotations;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class AddressCreateRequest
    {
        [Required, MaxLength(200)]
        public string RecipientName { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required, MaxLength(300)]
        public string Line1 { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? Line2 { get; set; }

        [MaxLength(100)]
        public string? Ward { get; set; }

        [MaxLength(100)]
        public string? District { get; set; }

        [MaxLength(100)]
        public string? Province { get; set; }

        public bool IsDefault { get; set; } = false;
    }

    public class AddressUpdateRequest : AddressCreateRequest { }

    public class AddressResponse
    {
        public int AddressId { get; set; }
        public string RecipientName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Line1 { get; set; } = string.Empty;
        public string? Line2 { get; set; }
        public string? Ward { get; set; }
        public string? District { get; set; }
        public string? Province { get; set; }
        public bool IsDefault { get; set; }
    }
}



