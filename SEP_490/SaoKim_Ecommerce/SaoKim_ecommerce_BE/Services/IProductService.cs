using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IProductService
    {
        Task<HomeProductsDto> GetHomeAsync(ProductQueryParams query);
        Task<PagedResult<ProductListItemDto>> GetPagedAsync(ProductQueryParams query);
    }
}
