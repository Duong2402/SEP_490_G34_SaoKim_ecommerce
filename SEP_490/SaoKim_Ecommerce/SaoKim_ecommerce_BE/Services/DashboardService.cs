using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly SaoKimDBContext _db;

        public DashboardService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<DashboardOverviewDTOs> GetOverviewAsync()
        {
            var today = DateTime.UtcNow.Date;
            var sevenDaysAgo = today.AddDays(-6);

            var totalRevenue = await _db.Orders
                .Where(o => o.Status == "Completed")
                .SumAsync(o => (decimal?)o.Total) ?? 0m;

            var revenue7d = await _db.Orders
                .Where(o => o.Status == "Completed" &&
                            o.CreatedAt.Date >= sevenDaysAgo &&
                            o.CreatedAt.Date <= today)
                .SumAsync(o => (decimal?)o.Total) ?? 0m;

            var revenueToday = await _db.Orders
                .Where(o => o.Status == "Completed" &&
                            o.CreatedAt.Date == today)
                .SumAsync(o => (decimal?)o.Total) ?? 0m;

            var ordersToday = await _db.Orders
                .CountAsync(o => o.CreatedAt.Date == today);

            var pendingOrders = await _db.Orders
                .CountAsync(o => o.Status == "Pending");

            var productsCount = await _db.Products.CountAsync();

            var customerRoleId = await _db.Roles
                .Where(r => r.Name.ToLower() == "customer")
                .Select(r => r.RoleId)
                .FirstOrDefaultAsync();

            var customersCount = await _db.Users
                .CountAsync(u =>
                    u.DeletedAt == null &&
                    u.RoleId == customerRoleId
                );

            return new DashboardOverviewDTOs
            {
                TotalRevenue = totalRevenue,
                Revenue7d = revenue7d,
                RevenueToday = revenueToday,
                OrdersToday = ordersToday,
                PendingOrders = pendingOrders,
                ProductsCount = productsCount,
                CustomersCount = customersCount
            };
        }

        public async Task<IReadOnlyList<RevenueByDayItemDto>> GetRevenueByDayAsync(int days)
        {
            if (days <= 0 || days > 90) days = 7;

            var today = DateTime.UtcNow.Date;
            var from = today.AddDays(-(days - 1));

            var raw = await _db.Orders
                .AsNoTracking()
                .Where(o =>
                    o.Status == "Completed" &&
                    o.CreatedAt.Date >= from &&
                    o.CreatedAt.Date <= today)
                .GroupBy(o => o.CreatedAt.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    Revenue = g.Sum(x => x.Total)
                })
                .ToListAsync();

            var dict = raw.ToDictionary(x => x.Date, x => x.Revenue);

            var result = new List<RevenueByDayItemDto>();
            for (var d = from; d <= today; d = d.AddDays(1))
            {
                dict.TryGetValue(d, out var rev);
                result.Add(new RevenueByDayItemDto
                {
                    Date = d,
                    Revenue = rev
                });
            }

            return result;
        }

        public async Task<IReadOnlyList<LatestOrderItemDTOs>> GetLatestOrdersAsync(int take)
        {
            if (take <= 0 || take > 50) take = 5;

            var orders = await _db.Orders
                .AsNoTracking()
                .Include(o => o.Customer)
                .OrderByDescending(o => o.CreatedAt)
                .Take(take)
                .Select(o => new LatestOrderItemDTOs
                {
                    OrderId = o.OrderId,
                    Total = o.Total,
                    Status = o.Status,
                    CreatedAt = o.CreatedAt,
                    CustomerName = o.Customer.Name
                })
                .ToListAsync();

            return orders;
        }
    }
}
