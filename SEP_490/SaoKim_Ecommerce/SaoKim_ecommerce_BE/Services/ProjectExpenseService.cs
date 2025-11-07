using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services
{
    public class ProjectExpenseService : IProjectExpenseService
    {
        private readonly SaoKimDBContext _db;
        public ProjectExpenseService(SaoKimDBContext db) => _db = db;

        private static ProjectExpenseListItemDTO Map(ProjectExpense x) => new()
        {
            Id = x.Id,
            Date = x.Date,
            Category = x.Category,
            Vendor = x.Vendor,
            Description = x.Description,
            Amount = x.Amount,
            ReceiptUrl = x.ReceiptUrl,
            CreatedAt = x.CreatedAt
        };

        public async Task<ProjectExpenseListResult> QueryAsync(int projectId, ProjectExpenseQuery q)
        {
            // Kiểm tra dự án có tồn tại
            var projectExists = await _db.Projects.AsNoTracking().AnyAsync(p => p.Id == projectId);
            if (!projectExists) throw new KeyNotFoundException("Project not found");

            var query = _db.ProjectExpenses.AsNoTracking().Where(x => x.ProjectId == projectId);

            if (q.From.HasValue) query = query.Where(x => x.Date >= q.From.Value);
            if (q.To.HasValue) query = query.Where(x => x.Date <= q.To.Value);
            if (!string.IsNullOrWhiteSpace(q.Category)) query = query.Where(x => x.Category == q.Category);
            if (!string.IsNullOrWhiteSpace(q.Vendor)) query = query.Where(x => x.Vendor == q.Vendor);

            if (!string.IsNullOrWhiteSpace(q.Keyword))
            {
                var kw = q.Keyword.Trim().ToLower();
                query = query.Where(x =>
                    (x.Vendor != null && x.Vendor.ToLower().Contains(kw)) ||
                    (x.Description != null && x.Description.ToLower().Contains(kw)) ||
                    (x.Category != null && x.Category.ToLower().Contains(kw))
                );
            }

            // sort
            if (!string.IsNullOrWhiteSpace(q.Sort))
            {
                var desc = q.Sort.StartsWith("-");
                var field = desc ? q.Sort[1..] : q.Sort;
                query = field switch
                {
                    "Amount" => desc ? query.OrderByDescending(x => x.Amount) : query.OrderBy(x => x.Amount),
                    "Date" => desc ? query.OrderByDescending(x => x.Date) : query.OrderBy(x => x.Date),
                    "CreatedAt" => desc ? query.OrderByDescending(x => x.CreatedAt) : query.OrderBy(x => x.CreatedAt),
                    _ => query.OrderByDescending(x => x.Date)
                };
            }
            else
            {
                query = query.OrderByDescending(x => x.Date);
            }

            var total = await query.LongCountAsync();
            var page = q.Page <= 0 ? 1 : q.Page;
            var size = q.PageSize <= 0 ? 20 : q.PageSize;

            var items = await query.Skip((page - 1) * size).Take(size)
                                   .Select(x => Map(x)).ToListAsync();

            // tổng thực chi (theo filter)
            var totalAmount = await query.SumAsync(x => (decimal?)x.Amount) ?? 0m;

            var paged = new PagedResult<ProjectExpenseListItemDTO>
            {
                Page = page,
                PageSize = size,
                TotalItems = (int)total,
                Items = items
            };

            return new ProjectExpenseListResult
            {
                Page = paged,
                TotalAmount = totalAmount
            };
        }

        public async Task<ProjectExpenseListItemDTO?> GetAsync(int projectId, int id)
        {
            var x = await _db.ProjectExpenses.AsNoTracking()
                        .FirstOrDefaultAsync(e => e.ProjectId == projectId && e.Id == id);
            return x == null ? null : Map(x);
        }

        public async Task<ProjectExpenseListItemDTO> CreateAsync(int projectId, ProjectExpenseCreateDTO dto, string? who)
        {
            var projectExists = await _db.Projects.AsNoTracking().AnyAsync(p => p.Id == projectId);
            if (!projectExists) throw new KeyNotFoundException("Project not found");

            if (dto.Amount < 0) throw new ArgumentException("Amount must be non-negative.");

            var entity = new ProjectExpense
            {
                ProjectId = projectId,
                Date = dto.Date,
                Category = string.IsNullOrWhiteSpace(dto.Category) ? null : dto.Category!.Trim(),
                Vendor = string.IsNullOrWhiteSpace(dto.Vendor) ? null : dto.Vendor!.Trim(),
                Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description!.Trim(),
                Amount = dto.Amount,
                ReceiptUrl = string.IsNullOrWhiteSpace(dto.ReceiptUrl) ? null : dto.ReceiptUrl!.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _db.ProjectExpenses.Add(entity);
            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<ProjectExpenseListItemDTO?> UpdateAsync(int projectId, int id, ProjectExpenseUpdateDTO dto, string? who)
        {
            var entity = await _db.ProjectExpenses.FirstOrDefaultAsync(e => e.ProjectId == projectId && e.Id == id);
            if (entity == null) return null;

            if (dto.Amount < 0) throw new ArgumentException("Amount must be non-negative.");

            entity.Date = dto.Date;
            entity.Category = string.IsNullOrWhiteSpace(dto.Category) ? null : dto.Category!.Trim();
            entity.Vendor = string.IsNullOrWhiteSpace(dto.Vendor) ? null : dto.Vendor!.Trim();
            entity.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description!.Trim();
            entity.Amount = dto.Amount;
            entity.ReceiptUrl = string.IsNullOrWhiteSpace(dto.ReceiptUrl) ? null : dto.ReceiptUrl!.Trim();

            await _db.SaveChangesAsync();
            return Map(entity);
        }

        public async Task<bool> DeleteAsync(int projectId, int id)
        {
            var entity = await _db.ProjectExpenses.FirstOrDefaultAsync(e => e.ProjectId == projectId && e.Id == id);
            if (entity == null) return false;
            _db.ProjectExpenses.Remove(entity);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
