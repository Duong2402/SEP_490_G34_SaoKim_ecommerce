using System;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/manager/employees")]
    [Authorize(Roles = "manager")]
    public class ManagerEmployeesController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        private readonly IWebHostEnvironment _env;

        public ManagerEmployeesController(SaoKimDBContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        #region Helpers

        private string GetUploadsRoot()
        {
            var webRoot = _env.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRoot))
            {
                webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            }

            var uploads = Path.Combine(webRoot, "uploads");
            Directory.CreateDirectory(uploads);
            return uploads;
        }

        private async Task<string?> SaveUserImageAsync(IFormFile? file)
        {
            if (file == null || file.Length == 0)
                return null;

            var uploadsRoot = GetUploadsRoot();
            var fileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
            var filePath = Path.Combine(uploadsRoot, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return $"/uploads/{fileName}";
        }

        private IQueryable<User> EmployeesBaseQuery()
        {
            var query = _db.Users
                .Include(u => u.Role)
                .Where(u => u.DeletedAt == null);

            return query;
        }

        private bool IsProtectedUser(User user)
        {
            if (user.Role?.Name == "Admin")
                return true;
            return false;
        }

        private static DateTime? ToUtc(DateTime? value)
        {
            if (!value.HasValue) return null;

            var dt = value.Value;
            if (dt.Kind == DateTimeKind.Unspecified)
            {
                return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
            }

            if (dt.Kind == DateTimeKind.Local)
            {
                return dt.ToUniversalTime();
            }

            return dt; 
        }

        #endregion

        #region DTOs

        public class EmployeeCreateDto
        {
            [Required, MaxLength(200)]
            public string Name { get; set; } = string.Empty;

            [Required, EmailAddress, MaxLength(200)]
            public string Email { get; set; } = string.Empty;

            [Required, MinLength(8)]
            public string Password { get; set; } = string.Empty;

            [Required]
            public int RoleId { get; set; }

            [MaxLength(20)]
            public string? PhoneNumber { get; set; }

            [MaxLength(300)]
            public string? Address { get; set; }

            public DateTime? Dob { get; set; }

            [MaxLength(50)]
            public string? Status { get; set; }

            public IFormFile? Image { get; set; }
        }

        public class EmployeeUpdateDto
        {
            [MaxLength(200)]
            public string? Name { get; set; }

            [EmailAddress, MaxLength(200)]
            public string? Email { get; set; }

            [MinLength(8)]
            public string? Password { get; set; }

            public int? RoleId { get; set; }

            [MaxLength(20)]
            public string? PhoneNumber { get; set; }

            [MaxLength(300)]
            public string? Address { get; set; }

            public DateTime? Dob { get; set; }

            [MaxLength(50)]
            public string? Status { get; set; }

            public IFormFile? Image { get; set; }
        }

        #endregion

        // GET /api/manager/employees
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? q,
            [FromQuery] string? role,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            page = Math.Max(1, page);
            pageSize = Math.Max(1, pageSize);

            var query = EmployeesBaseQuery();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = $"%{q.Trim()}%";
                query = query.Where(u =>
                    EF.Functions.ILike(u.Name ?? string.Empty, term) ||
                    EF.Functions.ILike(u.Email ?? string.Empty, term) ||
                    EF.Functions.ILike(u.PhoneNumber ?? string.Empty, term));
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
                .Select(u => new
                {
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

        // GET /api/manager/employees/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var u = await EmployeesBaseQuery()
                .FirstOrDefaultAsync(x => x.UserID == id);

            if (u == null) return NotFound(new { message = "Không tìm thấy nhân viên" });

            return Ok(new
            {
                id = u.UserID,
                name = u.Name,
                email = u.Email,
                phone = u.PhoneNumber,
                role = u.Role != null ? u.Role.Name : null,
                roleId = u.RoleId,
                status = u.Status,
                address = u.Address,
                dob = u.DOB,
                image = u.Image,
                createdAt = u.CreateAt
            });
        }

        // POST /api/manager/employees
        [HttpPost]
        [RequestSizeLimit(10_000_000)]
        public async Task<IActionResult> CreateEmployee([FromForm] EmployeeCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var exists = await _db.Users.AnyAsync(u => u.Email == dto.Email && u.DeletedAt == null);
            if (exists)
                return Conflict(new { message = "Email đã tồn tại" });

            var user = new User
            {
                Name = dto.Name.Trim(),
                Email = dto.Email.Trim(),
                Password = BCrypt.Net.BCrypt.HashPassword(dto.Password.Trim()),
                RoleId = dto.RoleId,
                PhoneNumber = dto.PhoneNumber?.Trim(),
                Address = dto.Address?.Trim(),
                DOB = ToUtc(dto.Dob),
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim(),
                CreateAt = DateTime.UtcNow,
            };

            if (dto.Image != null)
            {
                var imagePath = await SaveUserImageAsync(dto.Image);
                if (!string.IsNullOrWhiteSpace(imagePath))
                    user.Image = imagePath;
            }

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Nhân viên tạo thành công",
                id = user.UserID
            });
        }

        // PUT /api/manager/employees/{id}
        [HttpPut("{id:int}")]
        [RequestSizeLimit(10_000_000)]
        public async Task<IActionResult> UpdateEmployee(int id, [FromForm] EmployeeUpdateDto dto)
        {
            var user = await _db.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserID == id && u.DeletedAt == null);

            if (user == null)
                return NotFound(new { message = "Không tìm thấy nhân viên" });

            if (IsProtectedUser(user))
                return BadRequest(new { message = "Bạn không được phép chỉnh sửa thông tin tài khoản này" });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!string.IsNullOrWhiteSpace(dto.Email) &&
                !string.Equals(dto.Email.Trim(), user.Email, StringComparison.OrdinalIgnoreCase))
            {
                var emailExists = await _db.Users.AnyAsync(
                    u => u.Email == dto.Email && u.UserID != id && u.DeletedAt == null);

                if (emailExists)
                    return Conflict(new { message = "Email đã tồn tại" });

                user.Email = dto.Email.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
                user.Name = dto.Name.Trim();

            if (!string.IsNullOrWhiteSpace(dto.Address))
                user.Address = dto.Address.Trim();

            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
                user.PhoneNumber = dto.PhoneNumber.Trim();

            if (dto.Dob.HasValue)
            {
                var dobUtc = ToUtc(dto.Dob);
                if (dobUtc.HasValue)
                    user.DOB = dobUtc.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Status))
                user.Status = dto.Status.Trim();

            if (dto.RoleId.HasValue)
                user.RoleId = dto.RoleId.Value;

            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                user.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password.Trim());
            }

            if (dto.Image != null)
            {
                var imagePath = await SaveUserImageAsync(dto.Image);
                if (!string.IsNullOrWhiteSpace(imagePath))
                    user.Image = imagePath;
            }

            user.UpdateAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Nhân viên đã được cập nhật "});
        }

        // DELETE /api/manager/employees/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteEmployee(int id)
        {
            var user = await _db.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserID == id);

            if (user == null)
                return NotFound(new { message = "Không tìm thấy nhân viên" });

            if (IsProtectedUser(user))
                return BadRequest(new { message = "Bạn không được phép xóa tài khoản này" });

            if (user.DeletedAt != null)
                return BadRequest(new { message = "Nhân viên đã bị xóa" });

            user.DeletedAt = DateTime.UtcNow;
            user.Status = "Inactive";

            await _db.SaveChangesAsync();
            return Ok(new { message = "Nhân viên đã bị xóa" });
        }

        // GET /api/manager/employees/roles
        [HttpGet("roles")]
        public async Task<IActionResult> GetRolesForEmployees()
        {
            var roles = await _db.Roles
                .AsNoTracking()
                .OrderBy(r => r.Name)
                .Select(r => new { id = r.RoleId, name = r.Name })
                .ToListAsync();

            return Ok(roles);
        }
    }
}
