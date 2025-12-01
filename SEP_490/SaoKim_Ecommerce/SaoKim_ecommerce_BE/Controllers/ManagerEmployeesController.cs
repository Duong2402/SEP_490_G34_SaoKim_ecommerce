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
    // Nếu hệ thống auth/role chưa set xong, m có thể tạm đổi thành [AllowAnonymous] để test
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

            // Đường dẫn lưu vào DB, FE sẽ build URL dựa trên VITE_API_BASE_URL
            return $"/uploads/{fileName}";
        }

        // Rule: Manager không được sửa Admin
        private IQueryable<User> EmployeesBaseQuery()
        {
            // Soft delete: bỏ user có DeletedAt != null
            var query = _db.Users
                .Include(u => u.Role)
                .Where(u => u.DeletedAt == null);

            // Nếu m muốn giới hạn “nhân viên” là các role cụ thể, có thể filter thêm:
            // var employeeRoles = new[] { "Staff", "WarehouseManager", "CustomerService" };
            // query = query.Where(u => u.Role != null && employeeRoles.Contains(u.Role.Name));

            return query;
        }

        private bool IsProtectedUser(User user)
        {
            // Bảo vệ các tài khoản đặc biệt, ví dụ Admin
            if (user.Role?.Name == "Admin")
                return true;
            return false;
        }

        // Chuẩn hóa DateTime trước khi ghi vào PostgreSQL (timestamptz yêu cầu Kind = Utc)
        private static DateTime? ToUtc(DateTime? value)
        {
            if (!value.HasValue) return null;

            var dt = value.Value;
            if (dt.Kind == DateTimeKind.Unspecified)
            {
                // Xem date FE gửi lên là UTC; nếu muốn coi là local VN thì đổi sang ToUniversalTime()
                return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
            }

            if (dt.Kind == DateTimeKind.Local)
            {
                return dt.ToUniversalTime();
            }

            return dt; // đã là Utc
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
        // Cho Manager xem danh sách nhân viên
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

            if (u == null) return NotFound(new { message = "Employee not found" });

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
        // Manager tạo nhân viên mới
        [HttpPost]
        [RequestSizeLimit(10_000_000)]
        public async Task<IActionResult> CreateEmployee([FromForm] EmployeeCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Check email trùng (chỉ tính user chưa bị xóa mềm)
            var exists = await _db.Users.AnyAsync(u => u.Email == dto.Email && u.DeletedAt == null);
            if (exists)
                return Conflict(new { message = "Email already exists" });

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
                message = "Employee created",
                id = user.UserID
            });
        }

        // PUT /api/manager/employees/{id}
        // Manager chỉnh sửa thông tin nhân viên
        [HttpPut("{id:int}")]
        [RequestSizeLimit(10_000_000)]
        public async Task<IActionResult> UpdateEmployee(int id, [FromForm] EmployeeUpdateDto dto)
        {
            var user = await _db.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserID == id && u.DeletedAt == null);

            if (user == null)
                return NotFound(new { message = "Employee not found" });

            if (IsProtectedUser(user))
                return BadRequest(new { message = "You are not allowed to modify this account" });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Đổi email: check trùng
            if (!string.IsNullOrWhiteSpace(dto.Email) &&
                !string.Equals(dto.Email.Trim(), user.Email, StringComparison.OrdinalIgnoreCase))
            {
                var emailExists = await _db.Users.AnyAsync(
                    u => u.Email == dto.Email && u.UserID != id && u.DeletedAt == null);

                if (emailExists)
                    return Conflict(new { message = "Email already exists" });

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
            return Ok(new { message = "Employee updated" });
        }

        // DELETE /api/manager/employees/{id}
        // Manager ngưng / xóa nhân viên (soft delete)
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteEmployee(int id)
        {
            var user = await _db.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserID == id);

            if (user == null)
                return NotFound(new { message = "Employee not found" });

            if (IsProtectedUser(user))
                return BadRequest(new { message = "You are not allowed to delete this account" });

            if (user.DeletedAt != null)
                return BadRequest(new { message = "Employee already deleted" });

            user.DeletedAt = DateTime.UtcNow;
            user.Status = "Inactive";

            await _db.SaveChangesAsync();
            return Ok(new { message = "Employee deleted" });
        }

        // GET /api/manager/employees/roles
        // Nếu Manager cần dropdown role khi tạo/sửa nhân viên
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
