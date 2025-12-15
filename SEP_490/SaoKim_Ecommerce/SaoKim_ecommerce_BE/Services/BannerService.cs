using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Services
{
    public class BannerService : IBannerService
    {
        private readonly SaoKimDBContext _db;

        public BannerService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<IReadOnlyList<Banner>> GetAllAsync()
        {
            return await _db.Banners
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }

        public async Task<Banner?> GetByIdAsync(int id)
        {
            return await _db.Banners.FindAsync(id);
        }

        public async Task<Banner> CreateAsync(Banner model)
        {
            if (model.CreatedAt == default)
                model.CreatedAt = DateTime.UtcNow;

            _db.Banners.Add(model);
            await _db.SaveChangesAsync();
            return model;
        }

        public async Task<Banner?> UpdateAsync(int id, Banner model)
        {
            var banner = await _db.Banners.FindAsync(id);
            if (banner == null)
                return null;

            banner.Title = model.Title;
            banner.ImageUrl = model.ImageUrl;
            banner.LinkUrl = model.LinkUrl;
            banner.IsActive = model.IsActive;

            // nếu có UpdatedAt thì set thêm ở đây
            // banner.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return banner;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var banner = await _db.Banners.FindAsync(id);
            if (banner == null)
                return false;

            _db.Banners.Remove(banner);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
