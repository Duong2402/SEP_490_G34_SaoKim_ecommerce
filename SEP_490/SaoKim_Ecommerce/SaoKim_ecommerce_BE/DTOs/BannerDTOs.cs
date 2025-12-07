using Microsoft.AspNetCore.Mvc;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class BannerDTOs : Controller
    {
        public string Title { get; set; }
        public string ImageUrl { get; set; }
        public string LinkUrl { get; set; }
        public bool IsActive { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }
}
