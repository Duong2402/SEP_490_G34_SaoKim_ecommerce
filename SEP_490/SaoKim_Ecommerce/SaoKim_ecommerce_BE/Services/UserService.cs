using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services.Realtime;

namespace SaoKim_ecommerce_BE.Services
{
    public class UserService : IUserService
    {
        private readonly SaoKimDBContext _db;
        private readonly IRealtimePublisher _rt;

        public UserService(SaoKimDBContext db, IRealtimePublisher rt)
        {
            _db = db;
            _rt = rt;
        }

        public async Task<PagedResult<UserListItemDto>> GetAllAsync(
            string? q,
            string? role,
            string? status,
            int page,
            int pageSize)
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
            {
                query = query.Where(u => u.Role != null && u.Role.Name == role);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(u => u.Status == status);
            }

            var total = await query.CountAsync();

            var entities = await query
                .OrderByDescending(u => u.CreateAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = entities
                .Select(u => new UserListItemDto
                {
                    Id = u.UserID,
                    Name = u.Name,
                    Email = u.Email,
                    Phone = u.PhoneNumber,
                    Role = u.Role != null ? u.Role.Name : null,
                    Status = u.Status,
                    CreateAt = u.CreateAt
                })
                .ToList();

            return new PagedResult<UserListItemDto>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = total,
                Items = items
            };
        }

        public async Task<IReadOnlyList<ProjectManagerOptionDTO>> GetProjectManagersAsync()
        {
            var pms = await _db.Users
                .AsNoTracking()
                .Include(u => u.Role)
                .Where(u => u.Role != null && u.Role.Name == "project_manager")
                .OrderBy(u => u.Name)
                .Select(u => new ProjectManagerOptionDTO
                {
                    Id = u.UserID,
                    Name = u.Name ?? string.Empty,
                    Email = u.Email
                })
                .ToListAsync();

            return pms;
        }

        public async Task<UserDetailDto?> GetByIdAsync(int id)
        {
            var u = await _db.Users
                .AsNoTracking()
                .Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.UserID == id);

            if (u == null) return null;

            return new UserDetailDto
            {
                Id = u.UserID,
                Name = u.Name,
                Email = u.Email,
                Phone = u.PhoneNumber,
                Role = u.Role != null ? u.Role.Name : null,
                Status = u.Status,
                Address = u.Address,
                Dob = u.DOB,
                Image = u.Image,
                CreateAt = u.CreateAt
            };
        }

        public async Task<bool> UpdateUserAsync(int id, UserUpdateDto dto)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.UserID == id);
            if (user == null) return false;

            if (!string.IsNullOrWhiteSpace(dto.Status))
                user.Status = dto.Status.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Name))
                user.Name = dto.Name.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Address))
                user.Address = dto.Address.Trim();
            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
                user.PhoneNumber = dto.PhoneNumber.Trim();
            if (dto.Dob.HasValue)
                user.DOB = dto.Dob.Value;
            if (dto.RoleId.HasValue)
                user.RoleId = dto.RoleId.Value;

            await _db.SaveChangesAsync();
            await _rt.PublishAsync("users.updated", new
            {
                id = user.UserID,
                user.Name,
                user.Email,
                phone = user.PhoneNumber,
                user.Status,
                user.RoleId
            });
            return true;
        }

        public async Task<IReadOnlyList<RoleItemDto>> GetRolesAsync()
        {
            var roles = await _db.Roles
                .AsNoTracking()
                .OrderBy(r => r.Name)
                .Select(r => new RoleItemDto
                {
                    Id = r.RoleId,
                    Name = r.Name
                })
                .ToListAsync();

            return roles;
        }

        public async Task<UserDetailDto?> GetMeAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return null;

            var u = await _db.Users
                .AsNoTracking()
                .Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.Email == email);

            if (u == null) return null;

            return new UserDetailDto
            {
                Id = u.UserID,
                Name = u.Name,
                Email = u.Email,
                Phone = u.PhoneNumber,
                Role = u.Role != null ? u.Role.Name : null,
                Status = u.Status,
                Address = u.Address,
                Dob = u.DOB,
                Image = u.Image,
                CreateAt = u.CreateAt
            };
        }

        public async Task<bool> UpdateMeAsync(string email, UpdateProfileDto dto, string uploadsRoot)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return false;

            if (!string.IsNullOrWhiteSpace(dto.Name))
                user.Name = dto.Name.Trim();

            if (!string.IsNullOrWhiteSpace(dto.Address))
                user.Address = dto.Address.Trim();

            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
                user.PhoneNumber = dto.PhoneNumber.Trim();

            if (dto.Dob.HasValue)
            {
                var dob = dto.Dob.Value;

                if (dob.Kind == DateTimeKind.Unspecified)
                    dob = DateTime.SpecifyKind(dob, DateTimeKind.Utc);
                else
                    dob = dob.ToUniversalTime();

                user.DOB = dob;
            }


            if (dto.Image != null && dto.Image.Length > 0)
            {
                Directory.CreateDirectory(uploadsRoot);

                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(dto.Image.FileName)}";
                var filePath = Path.Combine(uploadsRoot, fileName);

                using (var stream = System.IO.File.Create(filePath))
                {
                    await dto.Image.CopyToAsync(stream);
                }

                user.Image = $"/uploads/avatars/{fileName}";
            }

            await _db.SaveChangesAsync();
            await _rt.PublishToUserAsync(user.UserID, "me.updated", new
            {
                id = user.UserID,
                name = user.Name,
                phone = user.PhoneNumber,
                address = user.Address,
                dob = user.DOB,
                image = user.Image,
                status = user.Status,
                roleId = user.RoleId
            });
            return true;
        }
    }
}
