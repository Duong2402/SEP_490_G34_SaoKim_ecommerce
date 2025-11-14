using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services
{
    public class CouponService : ICouponService
    {
        private readonly SaoKimDBContext _db;
        public CouponService(SaoKimDBContext db) { _db = db; }

        public async Task<(CouponListItemDto[] items, int total)> ListAsync(
            string? q, string? status, int page, int pageSize, string sortBy, string sortDir)
        {
            var query = _db.Coupons.AsNoTracking().AsQueryable();

            var now = DateTimeOffset.UtcNow;
            query = query.Select(c => new Coupon
            {
                Id = c.Id,
                Code = c.Code,
                Name = c.Name,
                Description = c.Description,
                DiscountType = c.DiscountType,
                DiscountValue = c.DiscountValue,
                MinOrderAmount = c.MinOrderAmount,
                MaxUsage = c.MaxUsage,
                PerUserLimit = c.PerUserLimit,
                StartDate = c.StartDate,
                EndDate = c.EndDate,
                CreatedAt = c.CreatedAt,
                TotalRedeemed = c.TotalRedeemed,
                Status = (c.EndDate != null && c.EndDate < now && c.Status != "Inactive") ? "Expired" :
                         (c.StartDate != null && c.StartDate > now && c.Status == "Active") ? "Scheduled" :
                         c.Status
            });

            if (!string.IsNullOrWhiteSpace(q))
            {
                var s = q.ToLower();
                query = query.Where(x => x.Name.ToLower().Contains(s) || x.Code.ToLower().Contains(s));
            }
            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(x => x.Status == status);
            }

            query = (sortBy, sortDir.ToLower()) switch
            {
                ("name", "asc") => query.OrderBy(x => x.Name),
                ("name", _) => query.OrderByDescending(x => x.Name),

                ("startDate", "asc") => query.OrderBy(x => x.StartDate),
                ("startDate", _) => query.OrderByDescending(x => x.StartDate),

                ("endDate", "asc") => query.OrderBy(x => x.EndDate),
                ("endDate", _) => query.OrderByDescending(x => x.EndDate),

                ("discountValue", "asc") => query.OrderBy(x => x.DiscountValue),
                ("discountValue", _) => query.OrderByDescending(x => x.DiscountValue),

                ("status", "asc") => query.OrderBy(x => x.Status),
                ("status", _) => query.OrderByDescending(x => x.Status),

                ("created", "asc") => query.OrderBy(x => x.CreatedAt),
                _ => query.OrderByDescending(x => x.CreatedAt)
            };

            var total = await query.CountAsync();
            var data = await query.Skip((page - 1) * pageSize).Take(pageSize)
                .Select(x => new CouponListItemDto
                {
                    Id = x.Id,
                    Code = x.Code,
                    Name = x.Name,
                    DiscountType = x.DiscountType,
                    DiscountValue = x.DiscountValue,
                    Status = x.Status,
                    StartDate = x.StartDate,
                    EndDate = x.EndDate,
                    CreatedAt = x.CreatedAt,
                    TotalRedeemed = x.TotalRedeemed
                })
                .ToArrayAsync();

            return (data, total);
        }

        public async Task<CouponDetailDto?> GetAsync(int id)
        {
            return await _db.Coupons.AsNoTracking()
                .Where(x => x.Id == id)
                .Select(x => new CouponDetailDto
                {
                    Id = x.Id,
                    Code = x.Code,
                    Name = x.Name,
                    Description = x.Description,
                    DiscountType = x.DiscountType,
                    DiscountValue = x.DiscountValue,
                    MinOrderAmount = x.MinOrderAmount,
                    MaxUsage = x.MaxUsage,
                    PerUserLimit = x.PerUserLimit,
                    Status = x.Status,
                    StartDate = x.StartDate,
                    EndDate = x.EndDate,
                    CreatedAt = x.CreatedAt,
                    TotalRedeemed = x.TotalRedeemed
                }).FirstOrDefaultAsync();
        }

        public async Task<int> CreateAsync(CouponCreateUpdateDto dto)
        {
            if (await _db.Coupons.AnyAsync(x => x.Code == dto.Code))
                throw new InvalidOperationException("Coupon code already exists.");

            var entity = new Coupon
            {
                Code = dto.Code.Trim(),
                Name = dto.Name.Trim(),
                Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description,
                DiscountType = dto.DiscountType,
                DiscountValue = dto.DiscountValue,
                MinOrderAmount = dto.MinOrderAmount,
                MaxUsage = dto.MaxUsage,
                PerUserLimit = dto.PerUserLimit,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Status = dto.Status,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _db.Coupons.Add(entity);
            await _db.SaveChangesAsync();
            return entity.Id;
        }

        public async Task UpdateAsync(int id, CouponCreateUpdateDto dto)
        {
            var entity = await _db.Coupons.FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new InvalidOperationException("Coupon not found.");

            if (!string.Equals(entity.Code, dto.Code, StringComparison.OrdinalIgnoreCase)
                && await _db.Coupons.AnyAsync(x => x.Code == dto.Code))
                throw new InvalidOperationException("Coupon code already exists.");

            entity.Code = dto.Code.Trim();
            entity.Name = dto.Name.Trim();
            entity.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description;
            entity.DiscountType = dto.DiscountType;
            entity.DiscountValue = dto.DiscountValue;
            entity.MinOrderAmount = dto.MinOrderAmount;
            entity.MaxUsage = dto.MaxUsage;
            entity.PerUserLimit = dto.PerUserLimit;
            entity.StartDate = dto.StartDate;
            entity.EndDate = dto.EndDate;
            entity.Status = dto.Status;

            await _db.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var entity = await _db.Coupons.FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new InvalidOperationException("Coupon not found.");
            _db.Coupons.Remove(entity);
            await _db.SaveChangesAsync();
        }

        public async Task DeactivateAsync(int id)
        {
            var entity = await _db.Coupons.FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new InvalidOperationException("Coupon not found.");
            entity.Status = "Inactive";
            await _db.SaveChangesAsync();
        }

        public async Task<bool> ToggleStatusAsync(int id)
        {
            var entity = await _db.Coupons.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return false;

            entity.Status = entity.Status == "Active" ? "Inactive" : "Active";
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
