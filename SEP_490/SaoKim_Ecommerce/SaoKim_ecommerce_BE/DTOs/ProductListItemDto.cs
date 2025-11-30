using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class ProductQueryParams
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 12;
        public string? SortBy { get; set; } = "new"; 
        public string? Keyword { get; set; }
        public int? CategoryId { get; set; }        
        public bool? Featured { get; set; }
    }

    public class HomeProductsDto
    {
        public IEnumerable<ProductListItemDto> Featured { get; set; } = Enumerable.Empty<ProductListItemDto>();
        public IEnumerable<ProductListItemDto> NewArrivals { get; set; } = Enumerable.Empty<ProductListItemDto>();
        public PagedResult<ProductListItemDto> All { get; set; } = new();
    }
}
