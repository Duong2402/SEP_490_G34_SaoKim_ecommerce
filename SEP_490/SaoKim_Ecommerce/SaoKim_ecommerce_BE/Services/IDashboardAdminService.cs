using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IDashboardAdminService
    {
        Task<DashboardAdminDTOs> GetOverviewAsync();
    }
}
