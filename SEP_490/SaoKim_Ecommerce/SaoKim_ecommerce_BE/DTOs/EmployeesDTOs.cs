
using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class EmployeeCreateDto
    {
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required, EmailAddress, MaxLength(200)]
        public string Email { get; set; } = string.Empty;

        [Required, MinLength(8)]
        public string Password { get; set; } = string.Empty;

        [Required]
        public int RoleId { get; set; }

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        public DateTime? Dob { get; set; }

        [MaxLength(50)]
        public string? Status { get; set; }

        public IFormFile? Image { get; set; }
    }

    public class EmployeeUpdateDto
    {
        [MaxLength(200)]
        public string? Name { get; set; }

        [EmailAddress, MaxLength(200)]
        public string? Email { get; set; }

        [MinLength(8)]
        public string? Password { get; set; }

        public int? RoleId { get; set; }

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        public DateTime? Dob { get; set; }

        [MaxLength(50)]
        public string? Status { get; set; }

        public IFormFile? Image { get; set; }
    }
    public class EmployeeListItemDto
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Role { get; set; }
        public string? Status { get; set; }
        public DateTime CreateAt { get; set; }
    }

    public class EmployeeDetailDto
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Role { get; set; }
        public int RoleId { get; set; }
        public string? Status { get; set; }
        public string? Address { get; set; }
        public DateTime? Dob { get; set; }
        public string? Image { get; set; }
        public DateTime CreateAt { get; set; }
    }

}
