namespace SaoKim_ecommerce_BE.DTOs
{
    public class ProductListItemDto
    {
        public int Id { get; set; }
        public string Sku { get; set; } = string.Empty;   // map ProductCode
        public string Name { get; set; } = string.Empty;  // map ProductName
        public string? Category { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public int Stock { get; set; }
        public string? Status { get; set; }
        public DateTime? Created { get; set; }
    }

    public class ProductDetailDto : ProductListItemDto
    {
        public string? Unit { get; set; }
        public string? Description { get; set; }
        public string? Supplier { get; set; }
        public string? Image { get; set; }
        public string? Note { get; set; }
        public DateTime Date { get; set; }
        public DateTime? CreateAt { get; set; }
        public string? CreateBy { get; set; }
        public string? UpdateBy { get; set; }
        public DateTime? UpdateAt { get; set; }
    }

    public class CreateProductDto
    {
        public string Sku { get; set; } = string.Empty;   // required
        public string Name { get; set; } = string.Empty;  // required
        public string? Category { get; set; }
        public string? Unit { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public int Stock { get; set; }
        public bool Active { get; set; } = true;
        public string? Description { get; set; }
        public string? Supplier { get; set; }
        public string? Image { get; set; }
        public string? Note { get; set; }
    }

    public class UpdateProductDto : CreateProductDto { }
}
