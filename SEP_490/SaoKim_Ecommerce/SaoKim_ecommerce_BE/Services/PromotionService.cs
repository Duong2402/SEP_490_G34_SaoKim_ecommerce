using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services
{
    public class PromotionService : IPromotionService
    {
        private readonly SaoKimDBContext _db;

        public PromotionService(SaoKimDBContext db) { _db = db; }

        public async Task<(IEnumerable<PromotionListItemDto> Items, int Total)> ListAsync(
            string? q, string? status, int page, int pageSize, string? sortBy, string? sortDir)
        {
            var qry = _db.Promotions.AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var keyword = q.Trim().ToLower();
                qry = qry.Where(x => x.Name.ToLower().Contains(keyword));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                qry = qry.Where(x => x.Status.ToString() == status);
            }

            bool asc = (sortDir ?? "desc").Equals("asc", StringComparison.OrdinalIgnoreCase);
            qry = (sortBy ?? "created").ToLower() switch
            {
                "name" => asc ? qry.OrderBy(x => x.Name) : qry.OrderByDescending(x => x.Name),
                "startdate" => asc ? qry.OrderBy(x => x.StartDate) : qry.OrderByDescending(x => x.StartDate),
                "enddate" => asc ? qry.OrderBy(x => x.EndDate) : qry.OrderByDescending(x => x.EndDate),
                "discountvalue" => asc ? qry.OrderBy(x => x.DiscountValue) : qry.OrderByDescending(x => x.DiscountValue),
                "status" => asc ? qry.OrderBy(x => x.Status) : qry.OrderByDescending(x => x.Status),
                _ => asc ? qry.OrderBy(x => x.CreatedAt) : qry.OrderByDescending(x => x.CreatedAt),
            };

            var total = await qry.CountAsync();
            var items = await qry.Skip((page - 1) * pageSize).Take(pageSize)
                .Select(x => new PromotionListItemDto
                {
                    Id = x.Id,
                    Name = x.Name,
                    Description = x.Description,
                    DiscountType = x.DiscountType.ToString(),
                    DiscountValue = x.DiscountValue,
                    StartDate = x.StartDate,
                    EndDate = x.EndDate,
                    Status = x.Status.ToString(),
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync();

            return (items, total);
        }
        public async Task<PromotionDetailDto?> GetAsync(int id)
        {
            var entity = await _db.Promotions
                .Include(p => p.PromotionProducts)
                .ThenInclude(pp => pp.Product)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (entity == null) return null;

            return new PromotionDetailDto
            {
                Id = entity.Id,
                Name = entity.Name,
                Description = entity.Description,
                DiscountType = entity.DiscountType.ToString(),
                DiscountValue = entity.DiscountValue,
                StartDate = entity.StartDate,
                EndDate = entity.EndDate,
                Status = entity.Status.ToString(),
                CreatedAt = entity.CreatedAt,
                Products = entity.PromotionProducts.Select(pp => new PromotionProductItemDto
                {
                    Id = pp.Id,
                    ProductId = pp.ProductId,
                    ProductName = pp.Product.ProductName,
                    ProductCode = pp.Product.ProductCode,
                    Note = pp.Note
                }).ToList()
            };
        }
        public async Task<int> CreateAsync(PromotionCreateDto dto)
        {
            var entity = new Promotion
            {
                Name = dto.Name,
                Description = dto.Description,
                DiscountType = Enum.TryParse<DiscountType>(dto.DiscountType, true, out var dt) ? dt : DiscountType.Percentage,
                DiscountValue = dto.DiscountValue,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Status = Enum.TryParse<PromotionStatus>(dto.Status, true, out var st) ? st : PromotionStatus.Draft,
                CreatedAt = DateTimeOffset.UtcNow
            };

            if (dto.ProductIds != null && dto.ProductIds.Count > 0)
            {
                var validIds = await _db.Products
                    .Where(p => dto.ProductIds.Contains(p.ProductID))
                    .Select(p => p.ProductID)
                    .ToListAsync();

                entity.PromotionProducts = validIds.Select(pid => new PromotionProduct
                {
                    ProductId = pid
                }).ToList();
            }

            _db.Promotions.Add(entity);
            await _db.SaveChangesAsync();
            return entity.Id;
        }

        public async Task<bool> UpdateAsync(int id, PromotionUpdateDto dto)
        {
            var entity = await _db.Promotions.FirstOrDefaultAsync(p => p.Id == id);
            if (entity == null) return false;

            entity.Name = dto.Name;
            entity.Description = dto.Description;
            entity.DiscountType = Enum.TryParse<DiscountType>(dto.DiscountType, true, out var dt) ? dt : entity.DiscountType;
            entity.DiscountValue = dto.DiscountValue;
            entity.StartDate = dto.StartDate;
            entity.EndDate = dto.EndDate;
            entity.Status = Enum.TryParse<PromotionStatus>(dto.Status, true, out var st) ? st : entity.Status;
            entity.UpdatedAt = DateTimeOffset.UtcNow;

            await _db.SaveChangesAsync();
            return true;
        }
        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _db.Promotions.Include(p => p.PromotionProducts).FirstOrDefaultAsync(p => p.Id == id);
            if (entity == null) return false;

            _db.Promotions.Remove(entity); // cascade
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> AddProductAsync(int promotionId, int productId, string? note)
        {
            var exists = await _db.PromotionProducts.AnyAsync(x => x.PromotionId == promotionId && x.ProductId == productId);
            if (exists) return true;

            var productExists = await _db.Products.AnyAsync(p => p.ProductID == productId);
            if (!productExists) return false;

            _db.PromotionProducts.Add(new PromotionProduct
            {
                PromotionId = promotionId,
                ProductId = productId,
                Note = note
            });

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RemoveProductAsync(int promotionProductId)
        {
            var entity = await _db.PromotionProducts.FirstOrDefaultAsync(x => x.Id == promotionProductId);
            if (entity == null) return false;

            _db.PromotionProducts.Remove(entity);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
