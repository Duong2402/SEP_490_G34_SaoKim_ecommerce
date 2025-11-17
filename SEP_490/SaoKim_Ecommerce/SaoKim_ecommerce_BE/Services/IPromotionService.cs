using System.Collections.Generic;
using System.Threading.Tasks;
using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IPromotionService
    {
        Task<(IEnumerable<PromotionListItemDto> Items, int Total)> ListAsync(
            string? q, string? status, int page, int pageSize, string? sortBy, string? sortDir);

        Task<PromotionDetailDto?> GetAsync(int id);

        Task<int> CreateAsync(PromotionCreateDto dto);
        Task<bool> UpdateAsync(int id, PromotionUpdateDto dto);
        Task<bool> DeleteAsync(int id);

        Task<bool> AddProductAsync(int promotionId, int productId, string? note);
        Task<bool> RemoveProductAsync(int promotionProductId);
    }
}
