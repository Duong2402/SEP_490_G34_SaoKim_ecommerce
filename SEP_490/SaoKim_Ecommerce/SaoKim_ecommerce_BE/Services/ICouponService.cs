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

        Task<bool> ToggleStatusAsync(int id);

        Task DeactivateAsync(int id);

        Task<CouponApplyResultDTOs> ValidateForOrderAsync(string code, decimal orderSubtotal, int userId);
    }
}
