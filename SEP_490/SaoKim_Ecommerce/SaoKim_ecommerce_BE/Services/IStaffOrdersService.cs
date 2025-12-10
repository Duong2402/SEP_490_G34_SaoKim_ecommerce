using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IStaffOrdersService
    {
        Task<PagedResult<StaffOrderListItemDto>> GetListAsync(
            string? q,
            string? status,
            DateTime? createdFrom,
            DateTime? createdTo,
            string sortBy,
            string sortDir,
            int page,
            int pageSize);

        Task<StaffOrderDetailDto?> GetByIdAsync(int id);

        Task UpdateStatusAsync(int id, string newStatus);

        Task<List<StaffOrderItemDto>> GetItemsAsync(int orderId);

        Task DeleteAsync(int id);
    }
}
