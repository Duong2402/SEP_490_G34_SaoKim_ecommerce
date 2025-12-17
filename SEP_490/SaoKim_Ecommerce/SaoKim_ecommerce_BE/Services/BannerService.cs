using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Services
{
    public class BannerService : IBannerService
    {
        private readonly SaoKimDBContext _db;
        private readonly IWebHostEnvironment _env;

        public BannerService(SaoKimDBContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        public async Task<IReadOnlyList<Banner>> GetAllAsync()
        {
            return await _db.Banners
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }
        public async Task<IReadOnlyList<Banner>> GetActiveAsync(DateTime nowUtc)
        {
            return await _db.Banners
                .Where(b =>
                    b.IsActive &&
                    !string.IsNullOrEmpty(b.ImageUrl) &&
                    (b.StartDate == null || b.StartDate <= nowUtc) &&
                    (b.EndDate == null || b.EndDate >= nowUtc)
                )
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();
        }

        public async Task<Banner?> GetByIdAsync(int id)
        {
            return await _db.Banners.FindAsync(id);
        }

        public async Task<Banner> CreateAsync(Banner model)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            model.Title = model.Title?.Trim() ?? "";
            model.ImageUrl = model.ImageUrl?.Trim() ?? "";

            if (model.CreatedAt == default)
                model.CreatedAt = DateTime.UtcNow;

            _db.Banners.Add(model);
            await _db.SaveChangesAsync();
            return model;
        }

        public async Task<Banner?> UpdateAsync(int id, Banner model)
        {
            if (model == null) throw new ArgumentNullException(nameof(model));

            var banner = await _db.Banners.FindAsync(id);
            if (banner == null)
                return null;

            var newImageUrl = (model.ImageUrl ?? "").Trim();
            var oldImageUrl = banner.ImageUrl ?? "";

            // Nếu đổi ảnh và ảnh cũ là file local (/uploads/...) thì xóa file cũ
            if (!string.Equals(oldImageUrl, newImageUrl, StringComparison.OrdinalIgnoreCase))
            {
                DeleteLocalUploadIfAny(oldImageUrl);
            }

            banner.Title = model.Title?.Trim() ?? "";
            banner.ImageUrl = newImageUrl;
            banner.LinkUrl = string.IsNullOrWhiteSpace(model.LinkUrl) ? null : model.LinkUrl.Trim();
            banner.IsActive = model.IsActive;
            banner.StartDate = model.StartDate;
            banner.EndDate = model.EndDate;

            await _db.SaveChangesAsync();
            return banner;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var banner = await _db.Banners.FindAsync(id);
            if (banner == null)
                return false;

            // Xóa file ảnh nếu là local upload
            DeleteLocalUploadIfAny(banner.ImageUrl);

            _db.Banners.Remove(banner);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<BannerStatsDto> GetStatsAsync(DateTime nowUtc)
        {
            var activeCount = await _db.Banners
                .Where(b =>
                    b.IsActive &&
                    (b.StartDate == null || b.StartDate <= nowUtc) &&
                    (b.EndDate == null || b.EndDate >= nowUtc)
                )
                .CountAsync();

            var expiringSoon = await _db.Banners
                .Where(b =>
                    b.IsActive &&
                    (b.StartDate == null || b.StartDate <= nowUtc) &&
                    b.EndDate != null &&
                    b.EndDate >= nowUtc &&
                    b.EndDate <= nowUtc.AddDays(7)
                )
                .OrderBy(b => b.EndDate)
                .Select(b => new BannerStatsItemDto
                {
                    Id = b.Id,
                    Title = b.Title,
                    ImageUrl = b.ImageUrl,
                    LinkUrl = b.LinkUrl,
                    IsActive = b.IsActive,
                    StartDate = b.StartDate,
                    EndDate = b.EndDate
                })
                .ToListAsync();

            return new BannerStatsDto
            {
                ActiveBanners = activeCount,
                ExpiringSoon = expiringSoon
            };
        }

        private void DeleteLocalUploadIfAny(string? imageUrl)
        {
            if (string.IsNullOrWhiteSpace(imageUrl)) return;

            if (!imageUrl.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase)) return;

            var rel = imageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            var root = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var fullPath = Path.Combine(root, rel);

            try
            {
                if (File.Exists(fullPath))
                    File.Delete(fullPath);
            }
            catch
            {
            }
        }
    }
}
