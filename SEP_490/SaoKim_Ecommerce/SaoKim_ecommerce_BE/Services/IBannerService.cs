using SaoKim_ecommerce_BE.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Services
{
    public class BannerStatsItemDto
    {
        public int Id { get; set; }
        public string? Title { get; set; }
        public string? ImageUrl { get; set; }
        public string? LinkUrl { get; set; }
        public bool IsActive { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class BannerStatsDto
    {
        public int ActiveBanners { get; set; }
        public List<BannerStatsItemDto> ExpiringSoon { get; set; } = new();
    }

    public interface IBannerService
    {
        Task<IReadOnlyList<Banner>> GetAllAsync();
        Task<Banner?> GetByIdAsync(int id);
        Task<Banner> CreateAsync(Banner model);
        Task<Banner?> UpdateAsync(int id, Banner model);
        Task<bool> DeleteAsync(int id);

        Task<BannerStatsDto> GetStatsAsync(DateTime utcToday);
    }
}
