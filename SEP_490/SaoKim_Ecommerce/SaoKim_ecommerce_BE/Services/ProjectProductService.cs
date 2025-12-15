using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services
{
    public class ProjectProductService : IProjectProductService
    {
        private readonly SaoKimDBContext _db;

        public ProjectProductService(SaoKimDBContext db)
        {
            _db = db;
        }
        public async Task<ProjectProductListDTO> GetProductsAsync(int projectId)
        {
            var exists = await _db.Projects.AsNoTracking().AnyAsync(p => p.Id == projectId);
            if (!exists) throw new KeyNotFoundException("Project not found");

            var items = await _db.ProjectProducts
                .AsNoTracking()
                .Where(x => x.ProjectId == projectId)
                .OrderBy(x => x.Id)
                .Select(x => new ProjectProductItemDTO
                {
                    Id = x.Id,
                    ProductId = x.ProductId,
                    ProductName = x.ProductName,
                    Uom = x.Uom,
                    Quantity = x.Quantity,
                    UnitPrice = x.UnitPrice,
                    Total = x.Total,
                    Note = x.Note
                })
                .ToListAsync();

            return new ProjectProductListDTO
            {
                ProjectId = projectId,
                Items = items,
                Subtotal = items.Sum(i => i.Total)
            };
        }

        public async Task<ProjectProductItemDTO> AddProductAsync(int projectId, ProjectProductCreateDTO dto)
        {
            var project = await _db.Projects.FindAsync(projectId);
            if (project == null) throw new KeyNotFoundException("Project not found");

            var productInfo = await _db.Products
                .Where(p => p.ProductID == dto.ProductId)
                .Select(p => new
                {
                    Product = p,
                    Detail = p.ProductDetails
                        .OrderByDescending(d => d.Id)
                        .FirstOrDefault()
                })
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (productInfo == null || productInfo.Product == null)
                throw new KeyNotFoundException("Product not found");

            var product = productInfo.Product;
            var detail = productInfo.Detail;

            var dup = await _db.ProjectProducts
                .AnyAsync(x => x.ProjectId == projectId && x.ProductId == dto.ProductId);
            if (dup) throw new InvalidOperationException("Product already added to this project");

            if (!dto.UnitPrice.HasValue && detail == null)
                throw new InvalidOperationException("Unit price is required because product has no detail price");

            var unitPrice = dto.UnitPrice ?? detail!.Price;
            var total = unitPrice * dto.Quantity;

            var uom = detail?.Unit ?? "pcs";

            var entity = new ProjectProduct
            {
                ProjectId = projectId,
                ProductId = dto.ProductId,
                ProductName = product.ProductName,
                Uom = uom,
                Quantity = dto.Quantity,
                UnitPrice = unitPrice,
                Total = total,
                Note = dto.Note
            };

            _db.ProjectProducts.Add(entity);
            await _db.SaveChangesAsync();

            return new ProjectProductItemDTO
            {
                Id = entity.Id,
                ProductId = entity.ProductId,
                ProductName = entity.ProductName,
                Uom = entity.Uom,
                Quantity = entity.Quantity,
                UnitPrice = entity.UnitPrice,
                Total = entity.Total,
                Note = entity.Note
            };
        }

        public async Task<ProjectProductItemDTO?> UpdateProductAsync(int projectId, int projectProductId, ProjectProductUpdateDTO dto)
        {
            var entity = await _db.ProjectProducts
                .FirstOrDefaultAsync(x => x.Id == projectProductId && x.ProjectId == projectId);

            if (entity == null) return null;

            entity.Quantity = dto.Quantity;
            entity.UnitPrice = dto.UnitPrice;
            entity.Total = dto.Quantity * dto.UnitPrice;
            entity.Note = dto.Note;

            await _db.SaveChangesAsync();

            return new ProjectProductItemDTO
            {
                Id = entity.Id,
                ProductId = entity.ProductId,
                ProductName = entity.ProductName,
                Uom = entity.Uom,
                Quantity = entity.Quantity,
                UnitPrice = entity.UnitPrice,
                Total = entity.Total,
                Note = entity.Note
            };
        }
        public async Task<bool> RemoveProductAsync(int projectId, int projectProductId)
        {
            var entity = await _db.ProjectProducts
                .FirstOrDefaultAsync(x => x.Id == projectProductId && x.ProjectId == projectId);

            if (entity == null) return false;

            _db.ProjectProducts.Remove(entity);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
