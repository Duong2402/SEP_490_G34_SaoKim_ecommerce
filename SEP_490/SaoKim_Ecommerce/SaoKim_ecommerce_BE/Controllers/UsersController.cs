using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;   // NEW

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        public UsersController(SaoKimDBContext db) => _db = db;

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
            page = Math.Max(1, page);
            pageSize = Math.Max(1, pageSize);

            var query = _db.Users
                .AsNoTracking()
                .Include(u => u.Role)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = $"%{q.Trim()}%";
                query = query.Where(u =>
                    EF.Functions.ILike(u.Name ?? "", term) ||
                    EF.Functions.ILike(u.Email ?? "", term) ||
                    EF.Functions.ILike(u.PhoneNumber ?? "", term));
            }

            if (!string.IsNullOrWhiteSpace(role))
                query = query.Where(u => u.Role != null && u.Role.Name == role);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(u => u.Status == status);

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(u => u.CreateAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new {
                    id = u.UserID,
                    name = u.Name,
                    email = u.Email,
                    phone = u.PhoneNumber,
                    role = u.Role != null ? u.Role.Name : null,
                    status = u.Status,
                    createdAt = u.CreateAt
                })
                .ToListAsync();

            return Ok(new
            {
                items,
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling(total / (double)pageSize)
            });
        }

        // NEW: GET /api/users/project-managers
        // dùng cho Manager lấy danh sách PM làm dropdown
        [HttpGet("project-managers")]
        [AllowAnonymous] // nếu muốn chỉ Manager gọi được thì đổi sang [Authorize]
        public async Task<IActionResult> GetProjectManagers()
        {
            var pms = await _db.Users
                .AsNoTracking()
                .Include(u => u.Role)
                .Where(u => u.Role != null && u.Role.Name == "project_manager")
                .OrderBy(u => u.Name)
                .Select(u => new ProjectManagerOptionDTO
                {
                    Id = u.UserID,
                    Name = u.Name,
                    Email = u.Email
                })
                .ToListAsync();

            return Ok(pms);
        }

        // GET /api/users/{id}
        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var u = await _db.Users
                .AsNoTracking()
                .Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.UserID == id);

            if (u == null) return NotFound(new { message = "User not found" });

            return Ok(new
            {
                id = u.UserID,
                name = u.Name,
                email = u.Email,
                phone = u.PhoneNumber,
                role = u.Role != null ? u.Role.Name : null,
                status = u.Status,
                address = u.Address,
                dob = u.DOB,
                image = u.Image,
                createdAt = u.CreateAt
            });
        }

        // PUT /api/users/{id}
        [HttpPut("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UserUpdateDto dto)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserID == id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            if (!string.IsNullOrWhiteSpace(dto.Status))
                user.Status = dto.Status;
            if (!string.IsNullOrWhiteSpace(dto.Name))
                user.Name = dto.Name;
            if (!string.IsNullOrWhiteSpace(dto.Address))
                user.Address = dto.Address;
            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
                user.PhoneNumber = dto.PhoneNumber;
            if (dto.Dob.HasValue)
                user.DOB = dto.Dob.Value;
            if (dto.RoleId.HasValue)
                user.RoleId = dto.RoleId.Value;

            await _db.SaveChangesAsync();
            return Ok(new { message = "User updated" });
        }

        public class UserUpdateDto
        {
            public string? Name { get; set; }
            public string? Address { get; set; }
            public string? PhoneNumber { get; set; }
            public string? Status { get; set; }
            public DateTime? Dob { get; set; }
            public int? RoleId { get; set; }
        }

        // GET /api/users/roles 
        [HttpGet("roles")]
        [AllowAnonymous]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _db.Roles
                .AsNoTracking()
                .OrderBy(r => r.Name)
                .Select(r => new { id = r.RoleId, name = r.Name })
                .ToListAsync();

            return Ok(roles);
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetMe()
        {
            var email = User.Identity?.Name;
            if (string.IsNullOrEmpty(email))
                return Unauthorized(new { message = "User not logged in" });

            var u = await _db.Users
                .AsNoTracking()
                .Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.Email == email);

            if (u == null)
                return NotFound(new { message = "User not found" });

            return Ok(new
            {
                id = u.UserID,
                name = u.Name,
                email = u.Email,
                phone = u.PhoneNumber,
                role = u.Role != null ? u.Role.Name : null,
                status = u.Status,
                address = u.Address,
                dob = u.DOB,
                image = u.Image,
                createdAt = u.CreateAt
            });
        }
    }
}