namespace SaoKim_ecommerce_BE.DTOs
{
    public class TraceSearchQuery
    {
        public string? Query { get; set; }
    }
    public class TraceEventDto
    {
        public DateTime Time { get; set; }
        public string? Type { get; set; }
        public string? Ref { get; set; }
        public string? Actor { get; set; }
        public string? Note { get; set; }
    }

    public class TraceSearchResultDto
    {
        public int Id { get; set; }
        public string Serial { get; set; } = string.Empty;
        public string? Sku { get; set; }
        public string? ProductName { get; set; }
        public string? Status { get; set; }
        public string? Project { get; set; }
        public string? CurrentLocation { get; set; }

        public List<TraceEventDto> Timeline { get; set; } = new();
    }
    public class ProductTraceMovementDto
    {
        public string Direction { get; set; } = "";
        public string SlipType { get; set; } = ""; 
        public string? RefNo { get; set; }
        public string? Partner { get; set; }
        public DateTime Date { get; set; }
        public int Quantity { get; set; }
        public string? Uom { get; set; }
        public string? Note { get; set; }
        public int SlipId { get; set; }
    }

    public class ProductTraceDto
    {
        public int ProductId { get; set; }
        public string? ProductCode { get; set; }
        public string ProductName { get; set; } = "";
        public string? Unit { get; set; }

        public List<ProductTraceMovementDto> Movements { get; set; } = new();
    }
}
