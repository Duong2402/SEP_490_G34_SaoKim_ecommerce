using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services
{
    public class ProductService : IProductService
    {
        private readonly SaoKimDBContext _db;
        public ProductService(SaoKimDBContext db) { _db = db; }

        public async Task<IEnumerable<ProductListItemDto>> GetAllAsync(string? search = null)
        {
            var q = _db.Products.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                q = q.Where(p =>
                    p.ProductName.ToLower().Contains(s) ||
                    p.ProductCode.ToLower().Contains(s) ||
                    (p.Category ?? "").ToLower().Contains(s));
            }

            return await q.OrderByDescending(p => p.CreateAt ?? p.Created ?? p.Date)
                .Select(p => new ProductListItemDto
                {
                    Id = p.ProductID,
                    Sku = p.ProductCode,
                    Name = p.ProductName,
                    Category = p.Category,
                    Price = p.Price,
                    Quantity = p.Quantity,
                    Stock = p.Stock,
                    Status = p.Status,
                    Created = p.Created
                })
                .ToListAsync();
        }

        public async Task<ProductDetailDto?> GetByIdAsync(int id)
        {
            return await _db.Products.AsNoTracking()
                .Where(p => p.ProductID == id)
                .Select(p => new ProductDetailDto
                {
                    Id = p.ProductID,
                    Sku = p.ProductCode,
                    Name = p.ProductName,
                    Category = p.Category,
                    Unit = p.Unit,
                    Price = p.Price,
                    Quantity = p.Quantity,
                    Stock = p.Stock,
                    Status = p.Status,
                    Image = p.Image,
                    Description = p.Description,
                    Supplier = p.Supplier,
                    Note = p.Note,
                    Created = p.Created,
                    Date = p.Date,
                    CreateAt = p.CreateAt,
                    CreateBy = p.CreateBy,
                    UpdateBy = p.UpdateBy,
                    UpdateAt = p.UpdateAt
                })
                .FirstOrDefaultAsync();
        }

        public async Task<int> CreateAsync(CreateProductDto dto)
        {
            var code = dto.Sku.Trim();
            if (string.IsNullOrWhiteSpace(code)) throw new ArgumentException("Sku is required.");
            if (string.IsNullOrWhiteSpace(dto.Name)) throw new ArgumentException("Name is required.");

            var exists = await _db.Products.AnyAsync(x => x.ProductCode == code);
            if (exists) throw new InvalidOperationException("Product code already exists.");

            var e = new Product
            {
                ProductCode = code,
                ProductName = dto.Name.Trim(),
                Category = dto.Category,
                Unit = dto.Unit,
                Price = dto.Price,
                Quantity = dto.Quantity,
                Stock = dto.Stock,
                Status = dto.Active ? "Active" : "Inactive",
                Image = dto.Image,
                Description = dto.Description,
                Supplier = dto.Supplier,
                Note = dto.Note,
                Created = DateTime.UtcNow,
                CreateAt = DateTime.UtcNow,
                Date = DateTime.UtcNow
            };

            _db.Products.Add(e);
            await _db.SaveChangesAsync();
            return e.ProductID;
        }

        public async Task<bool> UpdateAsync(int id, UpdateProductDto dto)
        {
            var e = await _db.Products.FirstOrDefaultAsync(x => x.ProductID == id);
            if (e == null) return false;

            var code = dto.Sku.Trim();
            if (!code.Equals(e.ProductCode, StringComparison.OrdinalIgnoreCase))
            {
                var exists = await _db.Products.AnyAsync(x => x.ProductCode == code && x.ProductID != id);
                if (exists) throw new InvalidOperationException("Product code already exists.");
                e.ProductCode = code;
            }

            e.ProductName = dto.Name.Trim();
            e.Category = dto.Category;
            e.Unit = dto.Unit;
            e.Price = dto.Price;
            e.Quantity = dto.Quantity;
            e.Stock = dto.Stock;
            e.Status = dto.Active ? "Active" : "Inactive";
            e.Image = dto.Image;
            e.Description = dto.Description;
            e.Supplier = dto.Supplier;
            e.Note = dto.Note;
            e.UpdateAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var e = await _db.Products.FirstOrDefaultAsync(x => x.ProductID == id);
            if (e == null) return false;

            _db.Products.Remove(e);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
