using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public class ProductService : IProductService
    {
        private readonly SaoKimDBContext _db;

        public ProductService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<HomeProductsDto> GetHomeAsync(ProductQueryParams query)
        {
            // Featured: 8 sp mới nhất, còn hàng
            var featured = await _db.Products
                .AsNoTracking()
                .Where(p => (p.Status == "Active" || p.Status == null) && p.Quantity > 0)
                .OrderByDescending(p => p.CreateAt ?? p.Date)
                .Take(8)
                .Select(p => new ProductListItemDto
                {
                    Id = p.ProductID,
                    Name = p.ProductName,
                    Slug = null,
                    Price = p.Price,
                    ThumbnailUrl = p.Image,
                    CreatedAt = p.CreateAt ?? p.Date,   // DTO non-null
                    Stock = p.Quantity                   // thêm Stock để InStock tính đúng
                })
                .ToListAsync();

            // New arrivals: 12 sp mới nhất
            var newArrivals = await _db.Products
                .AsNoTracking()
                .Where(p => p.Status == "Active" || p.Status == null)
                .OrderByDescending(p => p.CreateAt ?? p.Date)
                .Take(12)
                .Select(p => new ProductListItemDto
                {
                    Id = p.ProductID,
                    Name = p.ProductName,
                    Slug = null,
                    Price = p.Price,
                    ThumbnailUrl = p.Image,
                    CreatedAt = p.CreateAt ?? p.Date,
                    Stock = p.Quantity
                })
                .ToListAsync();

            // All (paged + filter/sort)
            var all = await GetPagedAsync(query);

            return new HomeProductsDto
            {
                Featured = featured,
                NewArrivals = newArrivals,
                All = all
            };
        }

        public async Task<PagedResult<ProductListItemDto>> GetPagedAsync(ProductQueryParams query)
        {
            query.Page = Math.Max(1, query.Page);
            query.PageSize = Math.Clamp(query.PageSize, 1, 60);

            var q = _db.Products.AsNoTracking()
                .Where(p => p.Status == "Active" || p.Status == null);

            // Keyword
            if (!string.IsNullOrWhiteSpace(query.Keyword))
            {
                var kw = query.Keyword.Trim();
                q = q.Where(p => EF.Functions.Like(p.ProductName, $"%{kw}%"));
                // Nếu DB phân biệt hoa/thường, có thể dùng: p.ProductName.ToLower().Contains(kw.ToLower())
            }

            // Category (đề nghị đổi ProductQueryParams.CategoryId -> Category: string?)
            // Nếu bạn CHƯA đổi DTO, tạm bỏ lọc Category để tránh sai lệch kiểu.
            // if (!string.IsNullOrWhiteSpace(query.Category))
            //     q = q.Where(p => p.Category == query.Category);

            // Sort
            q = query.SortBy switch
            {
                "price_asc" => q.OrderBy(p => p.Price).ThenByDescending(p => p.CreateAt ?? p.Date),
                "price_desc" => q.OrderByDescending(p => p.Price).ThenByDescending(p => p.CreateAt ?? p.Date),
                _ => q.OrderByDescending(p => p.CreateAt ?? p.Date)
            };

            var total = await q.CountAsync();

            var items = await q
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(p => new ProductListItemDto
                {
                    Id = p.ProductID,
                    Name = p.ProductName,
                    Slug = null,
                    Price = p.Price,
                    ThumbnailUrl = p.Image,
                    CreatedAt = p.CreateAt ?? p.Date,
                    Stock = p.Quantity
                })
                .ToListAsync();

            return new PagedResult<ProductListItemDto>
            {
                Page = query.Page,
                PageSize = query.PageSize,
                TotalItems = total,
                Items = items
            };
        }
    }
}
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
