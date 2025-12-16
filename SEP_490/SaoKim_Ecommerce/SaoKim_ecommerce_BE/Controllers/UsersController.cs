using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _svc;

        public UsersController(IUserService svc)
        {
            _svc = svc;
        }

        // GET /api/users
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? q,
            [FromQuery] string? role,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _svc.GetAllAsync(q, role, status, page, pageSize);
            return Ok(result); // hoặc bọc ApiResponse nếu mày muốn
        }

        // GET /api/users/project-managers
        [HttpGet("project-managers")]
        [AllowAnonymous]
        public async Task<IActionResult> GetProjectManagers()
        {
            var pms = await _svc.GetProjectManagersAsync();
            return Ok(pms);
        }

        // GET /api/users/{id}
        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var dto = await _svc.GetByIdAsync(id);
            if (dto == null)
                return NotFound(new { message = "Không tìm thấy người dùng" });

            return Ok(dto);
        }

        // PUT /api/users/{id}
        [HttpPut("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UserUpdateDto dto)
        {
            var ok = await _svc.UpdateUserAsync(id, dto);
            if (!ok)
                return NotFound(new { message = "Không tìm thấy người dùng" });

            return Ok(new { message = "User updated" });
        }

        // GET /api/users/roles
        [HttpGet("roles")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _svc.GetRolesAsync();
            return Ok(roles);
        }

        // GET /api/users/me
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetMe()
        {
            var email = User.Identity?.Name;
            if (string.IsNullOrEmpty(email))
                return Unauthorized(new { message = "Chưa đăng nhập" });

            var dto = await _svc.GetMeAsync(email);
            if (dto == null)
                return NotFound(new { message = "Không tìm thấy người dùng" });

            return Ok(dto);
        }

        // PUT /api/users/me
        [HttpPut("me")]
        [Authorize]
        public async Task<IActionResult> UpdateMe([FromForm] UpdateProfileDto dto)
        {
            var email = User.Identity?.Name;
            if (string.IsNullOrEmpty(email))
                return Unauthorized(new { message = "Chưa đăng nhập" });

            var uploadsRoot = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                "uploads",
                "avatars");

            var ok = await _svc.UpdateMeAsync(email, dto, uploadsRoot);
            if (!ok)
                return NotFound(new { message = "Không tìm thấy người dùng" });

            return Ok(new { message = "Profile updated successfully" });
        }
    }
}
