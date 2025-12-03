using System.ComponentModel.DataAnnotations;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class UpdateUserRequest
    {
        [MaxLength(200)]
        public string? Name { get; set; }

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        public DateTime? DOB { get; set; }

        public IFormFile? Image { get; set; }
    }

    public class UserProfileResponse
    {
        public int UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public DateTime? DOB { get; set; }
        public string? Image { get; set; }
        public string? Role { get; set; }
    }

    public class AddressRequest
    {
        [Required, MaxLength(200)]
        public string ReceiverName { get; set; }
        [Required, MaxLength(20)]
        public string Phone { get; set; }
        [Required, MaxLength(300)]
        public string Line1 { get; set; }
        public bool IsDefault { get; set; }
    }

    public class ProjectManagerOptionDTO
    {
        public int Id { get; set; }              
        public string Name { get; set; } = "";   
        public string Email { get; set; } = ""; 
    }
}
