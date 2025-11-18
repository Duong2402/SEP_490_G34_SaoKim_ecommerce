using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;

namespace SaoKim_ecommerce_BE.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly SaoKimDBContext _db;

    public DashboardController(SaoKimDBContext db)
    {
        _db = db;
    }

    // GET /api/dashboard/overview
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
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

        return Ok(new
        {
            totalRevenue,
            revenue7d,
            ordersToday,
            pendingOrders,
            productsCount,
            customersCount
        });
    }

    // GET /api/dashboard/revenue-by-day?days=7 thống kê theo ngày
    [HttpGet("revenue-by-day")]
    public async Task<IActionResult> GetRevenueByDay([FromQuery] int days = 7)
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

        var result = new List<object>();
        for (var d = from; d <= today; d = d.AddDays(1))
        {
            dict.TryGetValue(d, out var rev);
            result.Add(new
            {
                date = d,
                revenue = rev
            });
        }

        return Ok(result);
    }

    // GET /api/dashboard/latest-orders?take=5
    [HttpGet("latest-orders")]
    public async Task<IActionResult> GetLatestOrders([FromQuery] int take = 5)
    {
        if (take <= 0 || take > 50) take = 5;

        var orders = await _db.Orders
            .AsNoTracking()
            .Include(o => o.Customer)                 
            .OrderByDescending(o => o.CreatedAt)
            .Take(take)
            .Select(o => new
            {
                o.OrderId,
                o.Total,
                o.Status,
                o.CreatedAt,
                CustomerName = o.Customer.Name        
            })
            .ToListAsync();

        return Ok(orders);
    }

}
