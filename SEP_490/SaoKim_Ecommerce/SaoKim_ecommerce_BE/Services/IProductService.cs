using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IProductService
    {
        Task<HomeProductsDto> GetHomeAsync(ProductQueryParams query);
        Task<PagedResult<ProductListItemDto>> GetPagedAsync(ProductQueryParams query);
        Task ApplyPromotionAsync(IEnumerable<ProductListItemDto> items);


    }
}

