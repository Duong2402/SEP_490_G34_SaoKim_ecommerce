using System;
using System.ComponentModel.DataAnnotations;

namespace SaoKim_ecommerce_BE.Entities
{
    public class Banner
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string Title { get; set; } = "";

        [Required]
        [MaxLength(2000)]
        public string ImageUrl { get; set; } = "";

        [MaxLength(500)]
        public string? LinkUrl { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; }
    }
}
