using SaoKim_ecommerce_BE.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IDashboardService
    {
        Task<DashboardOverviewDTOs> GetOverviewAsync();

        Task<IReadOnlyList<RevenueByDayItemDto>> GetRevenueByDayAsync(int days);

        Task<IReadOnlyList<LatestOrderItemDTOs>> GetLatestOrdersAsync(int take);
    }
}
