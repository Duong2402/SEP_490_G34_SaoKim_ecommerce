using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/manager/reports")]
    [Authorize(Roles = "manager")]
    public class ManagerReportsController : ControllerBase
    {
        private readonly SaoKimDBContext _db;

        public ManagerReportsController(SaoKimDBContext db)
        {
            _db = db;
        }

        /// <summary>
        /// Tổng quan cho Manager:
        /// - Revenue: tổng doanh thu, 7 ngày, đơn hôm nay, pending
        /// - Warehouse: tổng tồn kho, inbound/outbound tuần này vs tuần trước
        /// - Projects: số lượng dự án, budget, chi phí thực tế
        /// </summary>
        [HttpGet("overview")]
        [ProducesResponseType(typeof(ManagerOverviewDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetOverview()
        {
            var today = DateTime.UtcNow.Date;
            var sevenDaysAgo = today.AddDays(-6);

            // ================== REVENUE / ORDERS ==================
            // Dựa trên Orders (giống phong cách DashboardController)
            var totalRevenue = await _db.Orders
                .Where(o => o.Status == "Completed")
                .SumAsync(o => (decimal?)o.Total) ?? 0m;

            var revenue7d = await _db.Orders
                .Where(o =>
                    o.Status == "Completed" &&
                    o.CreatedAt.Date >= sevenDaysAgo &&
                    o.CreatedAt.Date <= today)
                .SumAsync(o => (decimal?)o.Total) ?? 0m;

            var ordersToday = await _db.Orders
                .CountAsync(o => o.CreatedAt.Date == today);

            var pendingOrders = await _db.Orders
                .CountAsync(o => o.Status == "Pending");

            var revenueDto = new RevenueOverviewDto
            {
                TotalRevenue = totalRevenue,
                Revenue7d = revenue7d,
                OrdersToday = ordersToday,
                PendingOrders = pendingOrders
            };

            // ================== WAREHOUSE PERFORMANCE ==================
            var totalStock = await _db.ProductDetails
                .SumAsync(p => (int?)p.Quantity) ?? 0;

            var dayOfWeek = (int)today.DayOfWeek;
            var startOfThisWeek = today.AddDays(-dayOfWeek + 1); // Monday
            var startOfLastWeek = startOfThisWeek.AddDays(-7);

            var inboundThisWeek = await _db.ReceivingSlips
                .Where(s =>
                    s.Status == ReceivingSlipStatus.Confirmed &&
                    s.ReceiptDate.Date >= startOfThisWeek)
                .CountAsync();

            var inboundLastWeek = await _db.ReceivingSlips
                .Where(s =>
                    s.Status == ReceivingSlipStatus.Confirmed &&
                    s.ReceiptDate.Date >= startOfLastWeek &&
                    s.ReceiptDate.Date < startOfThisWeek)
                .CountAsync();

            var outboundThisWeek = await _db.Dispatches
                .Where(s =>
                    s.Status == DispatchStatus.Confirmed &&
                    s.DispatchDate.Date >= startOfThisWeek)
                .CountAsync();

            var outboundLastWeek = await _db.Dispatches
                .Where(s =>
                    s.Status == DispatchStatus.Confirmed &&
                    s.DispatchDate.Date >= startOfLastWeek &&
                    s.DispatchDate.Date < startOfThisWeek)
                .CountAsync();

            var warehouseDto = new WarehouseOverviewDto
            {
                TotalStock = totalStock,
                Inbound = new WarehouseFlowSummaryDto
                {
                    ThisWeek = inboundThisWeek,
                    LastWeek = inboundLastWeek
                },
                Outbound = new WarehouseFlowSummaryDto
                {
                    ThisWeek = outboundThisWeek,
                    LastWeek = outboundLastWeek
                }
            };

            // ================== PROJECT OVERVIEW ==================
            var projectsQuery = _db.Projects.AsNoTracking();

            var totalProjects = await projectsQuery.CountAsync();

            var draftProjects = await projectsQuery
                .CountAsync(p =>
                    ((p.Status ?? "").Trim().ToLower()) == "draft");

            var completedProjects = await projectsQuery
                .CountAsync(p =>
                    ((p.Status ?? "").Trim().ToLower()) == "completed" ||
                    ((p.Status ?? "").Trim().ToLower()) == "done");

            var activeProjects = totalProjects - draftProjects - completedProjects;

            var totalBudget = await projectsQuery
                .SumAsync(p => (decimal?)(p.Budget ?? 0m)) ?? 0m;

            var totalProductCost = await _db.ProjectProducts
                .SumAsync(x => (decimal?)x.Total) ?? 0m;

            var totalOtherExpenses = await _db.ProjectExpenses
                .SumAsync(x => (decimal?)x.Amount) ?? 0m;

            var projectDto = new ProjectOverviewDto
            {
                TotalProjects = totalProjects,
                DraftProjects = draftProjects,
                ActiveProjects = activeProjects,
                CompletedProjects = completedProjects,
                TotalBudget = totalBudget,
                TotalProductCost = totalProductCost,
                TotalOtherExpenses = totalOtherExpenses,
                TotalActualCost = totalProductCost + totalOtherExpenses
            };

            var overview = new ManagerOverviewDto
            {
                Revenue = revenueDto,
                Warehouse = warehouseDto,
                Projects = projectDto
            };

            return Ok(overview);
        }

        /// <summary>
        /// Doanh thu theo ngày trong N ngày gần nhất (phục vụ vẽ chart).
        /// </summary>
        /// GET /api/manager/reports/revenue-by-day?days=7
        [HttpGet("revenue-by-day")]
        [ProducesResponseType(typeof(IEnumerable<RevenueByDayItemDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetRevenueByDay([FromQuery] int days = 7)
        {
            if (days <= 0 || days > 90)
            {
                days = 7;
            }

            var today = DateTime.UtcNow.Date;
            var from = today.AddDays(-(days - 1));

            var raw = await _db.Orders
                .AsNoTracking()
                .Where(o =>
                    o.Status == "Completed" &&
                    o.CreatedAt.Date >= from &&
                    o.CreatedAt.Date <= today)
                .GroupBy(o => o.CreatedAt.Date)
                .Select(g => new RevenueByDayItemDto
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

            return Ok(result);
        }
    }
}
