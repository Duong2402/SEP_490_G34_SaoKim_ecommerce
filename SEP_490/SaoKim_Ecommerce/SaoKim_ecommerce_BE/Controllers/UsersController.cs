using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using System.Security.Claims;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    //[Authorize]
    public class UsersController : ControllerBase
    {
        private readonly SaoKimDBContext _db;

        public UsersController(SaoKimDBContext db)
        {
            _db = db;
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var userClaim = User.FindFirst("UserId")?.Value;
            if (string.IsNullOrWhiteSpace(userClaim))
                return Unauthorized(new { message = "Unauthorized" });

            if (!int.TryParse(userClaim, out var userId))
                return Unauthorized(new { message = "Unauthorized" });

            var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserID == userId);
            if (user == null) return NotFound(new { message = "User not found" });

            var res = new UserProfileResponse
            {
                UserId = user.UserID,
                Name = user.Name,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                Address = user.Address,
                DOB = user.DOB,
                Image = user.Image,
                Role = user.Role?.Name
            };

            return Ok(res);
        }

        [HttpPut("me")]
        [RequestSizeLimit(25_000_000)]
        public async Task<IActionResult> UpdateMe([FromForm] UpdateUserRequest req)
        {
            var userClaim = User.FindFirst("UserId")?.Value;
            if (string.IsNullOrWhiteSpace(userClaim))
                return Unauthorized(new { message = "Unauthorized" });

            if (!int.TryParse(userClaim, out var userId))
                return Unauthorized(new { message = "Unauthorized" });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserID == userId);
            if (user == null) return NotFound(new { message = "User not found" });

            if (!string.IsNullOrWhiteSpace(req.Name)) user.Name = req.Name!.Trim();
            if (!string.IsNullOrWhiteSpace(req.PhoneNumber)) user.PhoneNumber = req.PhoneNumber!.Trim();
            if (!string.IsNullOrWhiteSpace(req.Address)) user.Address = req.Address!.Trim();
            if (req.DOB.HasValue)
            {
                user.DOB = DateTime.SpecifyKind(req.DOB.Value, DateTimeKind.Utc);
            }

            if (req.Image != null && req.Image.Length > 0)
            {
                var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(uploadDir)) Directory.CreateDirectory(uploadDir);

                var fileName = $"{Guid.NewGuid()}_{req.Image.FileName}";
                var filePath = Path.Combine(uploadDir, fileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await req.Image.CopyToAsync(stream);
                }
                user.Image = $"/uploads/{fileName}";
            }

            user.UpdateAt = DateTime.UtcNow;
            user.UpdateBy = User.FindFirst(ClaimTypes.Name)?.Value;

            await _db.SaveChangesAsync();

            return Ok(new { message = "Profile updated" });
        }
    }
}



