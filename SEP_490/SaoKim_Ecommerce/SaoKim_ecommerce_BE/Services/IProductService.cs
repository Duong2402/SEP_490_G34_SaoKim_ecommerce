using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IProductService
    {
        Task<HomeProductsDto> GetHomeAsync(ProductQueryParams query);
        Task<PagedResult<ProductListItemDto>> GetPagedAsync(ProductQueryParams query);
    }
}
using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IProductService
    {
        Task<IEnumerable<ProductListItemDto>> GetAllAsync(string? search = null);
        Task<ProductDetailDto?> GetByIdAsync(int id);
        Task<int> CreateAsync(CreateProductDto dto);
        Task<bool> UpdateAsync(int id, UpdateProductDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
