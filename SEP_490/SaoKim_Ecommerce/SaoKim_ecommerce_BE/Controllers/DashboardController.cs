using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    // GET /api/dashboard/overview
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var overview = await _dashboardService.GetOverviewAsync();
        return Ok(overview);
    }

    // GET /api/dashboard/revenue-by-day?days=7
    [HttpGet("revenue-by-day")]
    public async Task<IActionResult> GetRevenueByDay([FromQuery] int days = 7)
    {
        var result = await _dashboardService.GetRevenueByDayAsync(days);
        return Ok(result);
    }

    // GET /api/dashboard/latest-orders?take=5
    [HttpGet("latest-orders")]
    public async Task<IActionResult> GetLatestOrders([FromQuery] int take = 5)
    {
        var orders = await _dashboardService.GetLatestOrdersAsync(take);
        return Ok(orders);
    }
}
