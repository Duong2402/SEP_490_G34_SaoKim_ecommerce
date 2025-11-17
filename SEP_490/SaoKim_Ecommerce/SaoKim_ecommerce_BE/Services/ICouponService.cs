using System.Threading.Tasks;
using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface ICouponService
    {
        Task<(CouponListItemDto[] items, int total)> ListAsync(
            string? q, string? status, int page, int pageSize, string sortBy, string sortDir);

        Task<CouponDetailDto?> GetAsync(int id);

        Task<int> CreateAsync(CouponCreateUpdateDto dto);
        Task UpdateAsync(int id, CouponCreateUpdateDto dto);
        Task DeleteAsync(int id);

        // NEW: bật/tắt giữa Active <-> Inactive
        Task<bool> ToggleStatusAsync(int id);
        // Giữ endpoint cũ nếu vẫn muốn gọi riêng “deactivate”
        Task DeactivateAsync(int id);
    }
}
