using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IManagerReportsService
    {
        Task<ManagerOverviewDto> GetOverviewAsync();
        Task<IReadOnlyList<RevenueByDayItemDto>> GetRevenueByDayAsync(int days);
    }
}
