using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/manager/reports")]
    [Authorize(Roles = "manager")]
    public class ManagerReportsController : ControllerBase
    {
        private readonly IManagerReportsService _svc;

        public ManagerReportsController(IManagerReportsService svc)
        {
            _svc = svc;
        }

        [HttpGet("overview")]
        [ProducesResponseType(typeof(ManagerOverviewDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetOverview()
        {
            var overview = await _svc.GetOverviewAsync();
            return Ok(overview);
        }

        [HttpGet("revenue-by-day")]
        [ProducesResponseType(typeof(IEnumerable<RevenueByDayItemDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetRevenueByDay([FromQuery] int days = 7)
        {
            var result = await _svc.GetRevenueByDayAsync(days);
            return Ok(result);
        }
    }
}
