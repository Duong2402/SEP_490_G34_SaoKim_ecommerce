using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public class DashboardAdminService : IDashboardAdminService
    {
        private readonly SaoKimDBContext _db;

        public DashboardAdminService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<DashboardAdminDTOs> GetOverviewAsync()
        {
            var now = DateTimeOffset.UtcNow;

            var todayStart = new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero);
            var tomorrowStart = todayStart.AddDays(1);

            var monthStart = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);
            var nextMonthStart = monthStart.AddMonths(1);

            var lastMonthStart = monthStart.AddMonths(-1);

            var totalUsers = await _db.Users.CountAsync();

            var newUsersToday = await _db.Users.CountAsync(u =>
                u.CreateAt >= todayStart && u.CreateAt < tomorrowStart);

            var newUsersThisMonth = await _db.Users.CountAsync(u =>
                u.CreateAt >= monthStart && u.CreateAt < nextMonthStart);

            var newUsersLastMonth = await _db.Users.CountAsync(u =>
                u.CreateAt >= lastMonthStart && u.CreateAt < monthStart);

            var start6 = monthStart.AddMonths(-5);
            var end6 = nextMonthStart;

            var raw = await _db.Users
                .Where(u => u.CreateAt >= start6 && u.CreateAt < end6)
                .GroupBy(u => new { u.CreateAt.Year, u.CreateAt.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
                .ToListAsync();

            var last6 = new List<MonthlyUserCount>();
            for (int i = 0; i < 6; i++)
            {
                var m = start6.AddMonths(i);
                var hit = raw.FirstOrDefault(x => x.Year == m.Year && x.Month == m.Month);

                last6.Add(new MonthlyUserCount
                {
                    Year = m.Year,
                    Month = m.Month,
                    Count = hit?.Count ?? 0,
                    Label = $"{m.Month:00}/{m.Year}"
                });
            }

            return new DashboardAdminDTOs
            {
                TotalUsers = totalUsers,
                NewUsersToday = newUsersToday,
                NewUsersThisMonth = newUsersThisMonth,
                NewUsersLastMonth = newUsersLastMonth,
                Last6MonthsUsers = last6
            };
        }
    }
}
