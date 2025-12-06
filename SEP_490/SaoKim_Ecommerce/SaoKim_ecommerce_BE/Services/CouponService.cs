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

        public CouponService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<(CouponListItemDto[] items, int total)> ListAsync(
            string? q,
            string? status,
            int page,
            int pageSize,
            string sortBy,
            string sortDir)
        {
            var now = DateTimeOffset.UtcNow;

            var query = _db.Coupons.AsNoTracking().AsQueryable();

            // Tìm kiếm theo code / name
            if (!string.IsNullOrWhiteSpace(q))
            {
                var s = q.Trim().ToLower();
                query = query.Where(x =>
                    x.Name.ToLower().Contains(s) ||
                    x.Code.ToLower().Contains(s));
            }

            // Lọc theo Status thô (Active/Inactive/…)
            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(x => x.Status == status);
            }

            // Sort
            sortBy = sortBy?.ToLower() ?? "createdat";
            sortDir = sortDir?.ToLower() ?? "desc";

            query = (sortBy, sortDir) switch
            {
                ("name", "asc") => query.OrderBy(x => x.Name),
                ("name", _) => query.OrderByDescending(x => x.Name),

                ("code", "asc") => query.OrderBy(x => x.Code),
                ("code", _) => query.OrderByDescending(x => x.Code),

                ("startdate", "asc") => query.OrderBy(x => x.StartDate),
                ("startdate", _) => query.OrderByDescending(x => x.StartDate),

                ("enddate", "asc") => query.OrderBy(x => x.EndDate),
                ("enddate", _) => query.OrderByDescending(x => x.EndDate),

                ("createdat", "asc") => query.OrderBy(x => x.CreatedAt),
                ("createdat", _) => query.OrderByDescending(x => x.CreatedAt),

                _ => query.OrderByDescending(x => x.CreatedAt)
            };

            var total = await query.CountAsync();

            var entities = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = entities
                .Select(c =>
                {
                    // Tính trạng thái hiển thị
                    var effectiveStatus = c.Status;
                    if (c.EndDate.HasValue && c.EndDate.Value < now && c.Status != "Inactive")
                    {
                        effectiveStatus = "Expired";
                    }
                    else if (c.StartDate.HasValue && c.StartDate.Value > now && c.Status == "Active")
                    {
                        effectiveStatus = "Scheduled";
                    }

                    return new CouponListItemDto
                    {
                        Id = c.Id,
                        Code = c.Code,
                        Name = c.Name,
                        DiscountType = c.DiscountType,
                        DiscountValue = c.DiscountValue,
                        Status = effectiveStatus,
                        StartDate = c.StartDate,
                        EndDate = c.EndDate,
                        CreatedAt = c.CreatedAt,
                        TotalRedeemed = c.TotalRedeemed
                    };
                })
                .ToArray();

            return (items, total);
        }

        public async Task<CouponDetailDto?> GetAsync(int id)
        {
            var c = await _db.Coupons
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (c == null) return null;

            var now = DateTimeOffset.UtcNow;
            var effectiveStatus = c.Status;
            if (c.EndDate.HasValue && c.EndDate.Value < now && c.Status != "Inactive")
            {
                effectiveStatus = "Expired";
            }
            else if (c.StartDate.HasValue && c.StartDate.Value > now && c.Status == "Active")
            {
                effectiveStatus = "Scheduled";
            }

            return new CouponDetailDto
            {
                Id = c.Id,
                Code = c.Code,
                Name = c.Name,
                DiscountType = c.DiscountType,
                DiscountValue = c.DiscountValue,
                Status = effectiveStatus,
                StartDate = c.StartDate,
                EndDate = c.EndDate,
                CreatedAt = c.CreatedAt,
                TotalRedeemed = c.TotalRedeemed,

                Description = c.Description,
                MinOrderAmount = c.MinOrderAmount,
                MaxUsage = c.MaxUsage,
                PerUserLimit = c.PerUserLimit
            };
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
                CreatedAt = DateTimeOffset.UtcNow,
                TotalRedeemed = 0
            };

            _db.Coupons.Add(entity);
            await _db.SaveChangesAsync();

            return entity.Id;
        }

        public async Task UpdateAsync(int id, CouponCreateUpdateDto dto)
        {
            var entity = await _db.Coupons.FirstOrDefaultAsync(x => x.Id == id)
                         ?? throw new InvalidOperationException("Coupon not found.");

            if (!string.Equals(entity.Code, dto.Code, StringComparison.OrdinalIgnoreCase) &&
                await _db.Coupons.AnyAsync(x => x.Code == dto.Code && x.Id != id))
            {
                throw new InvalidOperationException("Coupon code already exists.");
            }

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

        public async Task<CouponApplyResultDto> ValidateForOrderAsync(
            string code,
            decimal orderSubtotal,
            int userId)
        {
            var result = new CouponApplyResultDto
            {
                IsValid = false,
                Message = "Mã giảm giá không hợp lệ"
            };

            if (string.IsNullOrWhiteSpace(code) || orderSubtotal <= 0)
            {
                result.Message = "Mã hoặc giá trị đơn hàng không hợp lệ";
                return result;
            }

            code = code.Trim();
            var now = DateTimeOffset.UtcNow;

            var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Code == code);
            if (coupon == null)
            {
                result.Message = "Không tìm thấy mã giảm giá";
                return result;
            }

            if (!string.Equals(coupon.Status, "Active", StringComparison.OrdinalIgnoreCase))
            {
                result.Message = "Mã giảm giá không còn hiệu lực";
                return result;
            }

            if (coupon.StartDate.HasValue && coupon.StartDate.Value > now)
            {
                result.Message = "Mã giảm giá chưa đến thời gian sử dụng";
                return result;
            }

            if (coupon.EndDate.HasValue && coupon.EndDate.Value < now)
            {
                result.Message = "Mã giảm giá đã hết hạn";
                return result;
            }

            if (coupon.MinOrderAmount.HasValue && orderSubtotal < coupon.MinOrderAmount.Value)
            {
                result.Message = $"Đơn hàng tối thiểu {coupon.MinOrderAmount.Value:N0}đ để dùng mã này";
                return result;
            }

            if (coupon.MaxUsage.HasValue && coupon.TotalRedeemed >= coupon.MaxUsage.Value)
            {
                result.Message = "Mã giảm giá đã được sử dụng tối đa số lần cho phép";
                return result;
            }

            // Giới hạn số lần dùng / user
            if (coupon.PerUserLimit.HasValue && coupon.PerUserLimit.Value > 0 && userId > 0)
            {
                var usedCount = await _db.Orders
                    .AsNoTracking()
                    .CountAsync(o =>
                        o.UserId == userId &&
                        o.CouponCode == code);

                if (usedCount >= coupon.PerUserLimit.Value)
                {
                    result.Message = $"Bạn đã sử dụng mã này {usedCount} lần, vượt giới hạn cho phép.";
                    return result;
                }
            }

            decimal discountAmount = 0m;

            if (string.Equals(coupon.DiscountType, "Percentage", StringComparison.OrdinalIgnoreCase))
            {
                discountAmount = orderSubtotal * coupon.DiscountValue / 100m;
            }
            else if (string.Equals(coupon.DiscountType, "Fixed", StringComparison.OrdinalIgnoreCase))
            {
                discountAmount = coupon.DiscountValue;
            }

            if (discountAmount <= 0)
            {
                result.Message = "Mã giảm giá không áp dụng được cho đơn này";
                return result;
            }

            if (discountAmount > orderSubtotal)
            {
                discountAmount = orderSubtotal;
            }

            result.IsValid = true;
            result.Message = "Áp dụng mã giảm giá thành công";
            result.CouponId = coupon.Id;
            result.Code = coupon.Code;
            result.Name = coupon.Name;
            result.DiscountType = coupon.DiscountType;
            result.DiscountValue = coupon.DiscountValue;
            result.DiscountAmount = discountAmount;
            result.FinalTotal = orderSubtotal - discountAmount;

            return result;
        }
    }
}
