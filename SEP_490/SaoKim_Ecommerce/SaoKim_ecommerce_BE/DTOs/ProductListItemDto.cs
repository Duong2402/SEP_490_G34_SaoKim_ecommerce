﻿namespace SaoKim_ecommerce_BE.DTOs
{
    public class PagedResult<T>
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalItems / PageSize);
        public IEnumerable<T> Items { get; set; } = Enumerable.Empty<T>();
    }

    public class ProductQueryParams
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 12;
        public string? SortBy { get; set; } = "new"; // new|price_asc|price_desc
        public string? Keyword { get; set; }
        public int? CategoryId { get; set; }         // nếu có bảng Category
        public bool? Featured { get; set; }
    }

    public class HomeProductsDto
    {
        public IEnumerable<ProductListItemDto> Featured { get; set; } = Enumerable.Empty<ProductListItemDto>();
        public IEnumerable<ProductListItemDto> NewArrivals { get; set; } = Enumerable.Empty<ProductListItemDto>();
        public PagedResult<ProductListItemDto> All { get; set; } = new();
    }
}