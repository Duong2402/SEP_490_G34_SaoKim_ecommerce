using Microsoft.AspNetCore.Http;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class BannerDTOs
    {
        public string Title { get; set; } = "";
        public string? ImageUrl { get; set; }
        public string? LinkUrl { get; set; }
        public bool IsActive { get; set; } = true;

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public IFormFile? ImageFile { get; set; }
    }
}
