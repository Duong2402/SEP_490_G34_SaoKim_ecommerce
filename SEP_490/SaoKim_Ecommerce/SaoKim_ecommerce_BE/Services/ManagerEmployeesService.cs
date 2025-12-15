using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services
{
    public class ManagerEmployeesService : IManagerEmployeesService
    {
        private readonly SaoKimDBContext _db;
        private readonly IWebHostEnvironment _env;

        public ManagerEmployeesService(SaoKimDBContext db, IWebHostEnvironment env)
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
            return _db.Users
                .Include(u => u.Role)
                .Where(u => u.DeletedAt == null);
        }

        private bool IsProtectedUser(User user)
        {
            return user.Role?.Name == "Admin";
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

        public async Task<(List<EmployeeListItemDto> items, int total)> GetAllAsync(
            string? q,
            string? role,
            string? status,
            int page,
            int pageSize)
        {
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
                .Select(u => new EmployeeListItemDto
                {
                    Id = u.UserID,
                    Name = u.Name,
                    Email = u.Email,
                    Phone = u.PhoneNumber,
                    Role = u.Role != null ? u.Role.Name : null,
                    Status = u.Status,
                    CreateAt = u.CreateAt
                })
                .ToListAsync();

            return (items, total);
        }

        public async Task<EmployeeDetailDto?> GetByIdAsync(int id)
        {
            var u = await EmployeesBaseQuery()
                .FirstOrDefaultAsync(x => x.UserID == id);

            if (u == null) return null;

            return new EmployeeDetailDto
            {
                Id = u.UserID,
                Name = u.Name,
                Email = u.Email,
                Phone = u.PhoneNumber,
                Role = u.Role?.Name,
                RoleId = u.RoleId,
                Status = u.Status,
                Address = u.Address,
                Dob = u.DOB,
                Image = u.Image,
                CreateAt = u.CreateAt
            };
        }

        public async Task<int> CreateEmployeeAsync(EmployeeCreateDto dto)
        {
            var exists = await _db.Users.AnyAsync(u => u.Email == dto.Email && u.DeletedAt == null);
            if (exists)
                throw new InvalidOperationException("Email đã tồn tại");

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

            return user.UserID;
        }

        public async Task UpdateEmployeeAsync(int id, EmployeeUpdateDto dto)
        {
            var user = await _db.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserID == id && u.DeletedAt == null)
                ?? throw new KeyNotFoundException("Không tìm thấy nhân viên");

            if (IsProtectedUser(user))
                throw new InvalidOperationException("Bạn không được phép chỉnh sửa thông tin tài khoản này");

            if (!string.IsNullOrWhiteSpace(dto.Email) &&
                !string.Equals(dto.Email.Trim(), user.Email, StringComparison.OrdinalIgnoreCase))
            {
                var emailExists = await _db.Users.AnyAsync(
                    u => u.Email == dto.Email && u.UserID != id && u.DeletedAt == null);

                if (emailExists)
                    throw new InvalidOperationException("Email đã tồn tại");

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
        }

        public async Task DeleteEmployeeAsync(int id)
        {
            var user = await _db.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserID == id)
                ?? throw new KeyNotFoundException("Không tìm thấy nhân viên");

            if (IsProtectedUser(user))
                throw new InvalidOperationException("Bạn không được phép xóa tài khoản này");

            if (user.DeletedAt != null)
                throw new InvalidOperationException("Nhân viên đã bị xóa");

            user.DeletedAt = DateTime.UtcNow;
            user.Status = "Inactive";

            await _db.SaveChangesAsync();
        }

        public async Task<List<RoleItemDto>> GetRolesAsync()
        {
            return await _db.Roles
                .AsNoTracking()
                .OrderBy(r => r.Name)
                .Select(r => new RoleItemDto
                {
                    Id = r.RoleId,
                    Name = r.Name
                })
                .ToListAsync();
        }
    }
}
