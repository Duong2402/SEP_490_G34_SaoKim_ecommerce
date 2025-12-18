using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/admin/dashboard")]
    public class DashboardAdminController : ControllerBase
    {
        private readonly IDashboardAdminService _dashboardAdminService;

        public DashboardAdminController(IDashboardAdminService dashboardAdminService)
        {
            _dashboardAdminService = dashboardAdminService;
        }

        [HttpGet("overview")]
        [AllowAnonymous]
        public async Task<IActionResult> Overview()
        {
            var data = await _dashboardAdminService.GetOverviewAsync();
            return Ok(data);
        }
    }
}
