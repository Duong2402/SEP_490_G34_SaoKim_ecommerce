namespace SaoKim_ecommerce_BE.DTOs.WarehouseManagerDTOs
{
    public sealed class InventoryListQuery
    {
        public string? Search { get; set; }
        public string? Status { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public sealed class UpdateMinStockDto
    {
        public int MinStock { get; set; }
    }
}
