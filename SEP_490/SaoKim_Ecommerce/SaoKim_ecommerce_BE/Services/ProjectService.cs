using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IProjectService
    {
        Task<ProjectResponseDTO> CreateAsync(CreateProjectDTO dto, string? createdBy);
        Task<ProjectResponseDTO?> GetByIdAsync(int id);
        Task<PagedResult<ProjectResponseDTO>> QueryAsync(ProjectQuery q);
        Task<ProjectResponseDTO?> UpdateAsync(int id, UpdateProjectDTO dto, string? updatedBy);
        Task<bool> DeleteAsync(int id);
    }

    public class ProjectService : IProjectService
    {
        private readonly SaoKimDBContext _db;
        public ProjectService(SaoKimDBContext db) => _db = db;

        private static ProjectResponseDTO Map(Project p) => new()
        {
            Id = p.Id,
            Code = p.Code,
            Name = p.Name,
            CustomerName = p.CustomerName,
            CustomerContact = p.CustomerContact,
            Status = p.Status,
            StartDate = p.StartDate,
            EndDate = p.EndDate,
            Budget = p.Budget,
            Description = p.Description,
            CreatedAt = p.CreatedAt,
            CreatedBy = p.CreatedBy
        };

        private async Task<string> GenerateCodeAsync()
        {
            var prefix = $"PRJ-{DateTime.UtcNow:yyyy}-";
            var last = await _db.Projects.AsNoTracking()
                .Where(x => x.Code.StartsWith(prefix))
                .OrderByDescending(x => x.Code)
                .Select(x => x.Code)
                .FirstOrDefaultAsync();

            var next = 1;
            if (!string.IsNullOrWhiteSpace(last))
            {
                var tail = last.Substring(prefix.Length);
                if (int.TryParse(tail, out var n)) next = n + 1;
            }
            return $"{prefix}{next:D3}";
        }

        public async Task<ProjectResponseDTO> CreateAsync(CreateProjectDTO dto, string? createdBy)
        {
            if (dto.StartDate.HasValue && dto.EndDate.HasValue && dto.EndDate < dto.StartDate)
                throw new ArgumentException("EndDate must be greater than or equal to StartDate.");

            var code = string.IsNullOrWhiteSpace(dto.Code) ? await GenerateCodeAsync() : dto.Code!.Trim();
            var exists = await _db.Projects.AsNoTracking().AnyAsync(x => x.Code == code);
            if (exists) throw new InvalidOperationException("Project code already exists.");

            var entity = new Project
            {
                Code = code,
                Name = dto.Name.Trim(),
                CustomerName = string.IsNullOrWhiteSpace(dto.CustomerName) ? null : dto.CustomerName!.Trim(),
                CustomerContact = string.IsNullOrWhiteSpace(dto.CustomerContact) ? null : dto.CustomerContact!.Trim(),
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Draft" : dto.Status!.Trim(),
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Budget = dto.Budget,
                Description = dto.Description,
                CreatedBy = createdBy
            };

            _db.Projects.Add(entity);
            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<ProjectResponseDTO?> GetByIdAsync(int id)
        {
            var p = await _db.Projects.FindAsync(id);
            return p == null ? null : Map(p);
        }

        public async Task<PagedResult<ProjectResponseDTO>> QueryAsync(ProjectQuery q)
        {
            var query = _db.Projects.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(q.Keyword))
            {
                var kw = q.Keyword.Trim().ToLower();
                query = query.Where(x =>
                    x.Code.ToLower().Contains(kw) ||
                    x.Name.ToLower().Contains(kw) ||
                    (x.CustomerName != null && x.CustomerName.ToLower().Contains(kw)));
            }

            if (!string.IsNullOrWhiteSpace(q.Status))
            {
                query = query.Where(x => x.Status == q.Status);
            }

            // sort
            if (!string.IsNullOrWhiteSpace(q.Sort))
            {
                var desc = q.Sort.StartsWith("-");
                var field = desc ? q.Sort[1..] : q.Sort;
                query = field switch
                {
                    "Name" => desc ? query.OrderByDescending(x => x.Name) : query.OrderBy(x => x.Name),
                    "Code" => desc ? query.OrderByDescending(x => x.Code) : query.OrderBy(x => x.Code),
                    "CreatedAt" => desc ? query.OrderByDescending(x => x.CreatedAt) : query.OrderBy(x => x.CreatedAt),
                    _ => query.OrderByDescending(x => x.CreatedAt)
                };
            }

            var total = await query.LongCountAsync();
            var page = q.Page <= 0 ? 1 : q.Page;
            var size = q.PageSize <= 0 ? 20 : q.PageSize;

            var items = await query.Skip((page - 1) * size).Take(size)
                .Select(x => Map(x)).ToListAsync();

            return new PagedResult<ProjectResponseDTO>
            {
                Page = page,
                PageSize = size,
                Total = total,
                Items = items
            };
        }

        public async Task<ProjectResponseDTO?> UpdateAsync(int id, UpdateProjectDTO dto, string? updatedBy)
        {
            var p = await _db.Projects.FindAsync(id);
            if (p == null) return null;

            if (dto.StartDate.HasValue && dto.EndDate.HasValue && dto.EndDate < dto.StartDate)
                throw new ArgumentException("EndDate must be greater than or equal to StartDate.");

            p.Name = dto.Name.Trim();
            p.CustomerName = string.IsNullOrWhiteSpace(dto.CustomerName) ? null : dto.CustomerName!.Trim();
            p.CustomerContact = string.IsNullOrWhiteSpace(dto.CustomerContact) ? null : dto.CustomerContact!.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Status)) p.Status = dto.Status!.Trim();
            p.StartDate = dto.StartDate;
            p.EndDate = dto.EndDate;
            p.Budget = dto.Budget;
            p.Description = dto.Description;
            // có thể cập nhật UpdatedAt/UpdatedBy nếu muốn thêm 2 field này

            await _db.SaveChangesAsync();
            return Map(p);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var p = await _db.Projects.FindAsync(id);
            if (p == null) return false;
            _db.Projects.Remove(p); // nếu muốn soft-delete thì thêm cột IsDeleted và đổi logic
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
