using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Services
{
    public class CategoryService : ICategoryService
    {
        private readonly SaoKimDBContext _db;

        public CategoryService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<List<CategoryDto>> GetAllAsync()
        {
            return await _db.Categories
                .AsNoTracking()
                .OrderBy(c => c.Name)
                .Select(c => new CategoryDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Slug = c.Slug
                })
                .ToListAsync();
        }

        public async Task<CategoryDto?> GetByIdAsync(int id)
        {
            return await _db.Categories
                .AsNoTracking()
                .Where(x => x.Id == id)
                .Select(x => new CategoryDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    Slug = x.Slug
                })
                .FirstOrDefaultAsync();
        }

        public async Task<CategoryDto> CreateAsync(CreateCategoryDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("Tên danh mục là bắt buộc");

            var name = dto.Name.Trim();

            var exists = await _db.Categories
                .AnyAsync(x => x.Name.ToLower() == name.ToLower());

            if (exists)
                throw new InvalidOperationException("Danh mục đã tồn tại");

            var cat = new Category
            {
                Name = name,
                Slug = Slugify(name)
            };

            _db.Categories.Add(cat);
            await _db.SaveChangesAsync();

            return new CategoryDto
            {
                Id = cat.Id,
                Name = cat.Name,
                Slug = cat.Slug
            };
        }

        public async Task UpdateAsync(int id, UpdateCategoryDto dto)
        {
            var cat = await _db.Categories.FindAsync(id);
            if (cat == null)
                throw new KeyNotFoundException("Không tìm thấy danh mục");

            if (!string.IsNullOrWhiteSpace(dto.Name))
            {
                var newName = dto.Name.Trim();

                var dup = await _db.Categories
                    .AnyAsync(x => x.Id != id && x.Name.ToLower() == newName.ToLower());

                if (dup)
                    throw new InvalidOperationException("Tên danh mục đã được sử dụng");

                cat.Name = newName;
            }

            cat.Slug = string.IsNullOrWhiteSpace(dto.Slug)
                ? Slugify(cat.Name)
                : dto.Slug!.Trim();

            await _db.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var cat = await _db.Categories.FindAsync(id);
            if (cat == null)
                throw new KeyNotFoundException("Không tìm thấy danh mục");

            var hasProducts = await _db.ProductDetails.AnyAsync(p => p.CategoryId == id);
            if (hasProducts)
                throw new InvalidOperationException("Không thể xóa danh mục đang có sản phẩm");

            _db.Categories.Remove(cat);
            await _db.SaveChangesAsync();
        }

        private static string Slugify(string input)
        {
            var s = input.Trim().ToLower();
            s = Regex.Replace(s, @"\s+", "-");
            s = Regex.Replace(s, @"[^a-z0-9\-]", "");
            return s;
        }
    }
}
