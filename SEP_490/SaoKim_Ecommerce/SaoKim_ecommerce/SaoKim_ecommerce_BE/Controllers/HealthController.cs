using Microsoft.AspNetCore.Mvc;

namespace SaoKim_ecommerce_BE.Controllers
{
    using Microsoft.AspNetCore.Mvc;

    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get() => Ok(new { ok = true, time = DateTime.UtcNow });
    }

}
