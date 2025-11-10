namespace SaoKim_ecommerce_BE.DTOs.WarehouseManagerDTOs
{
    public sealed class TraceSearchQuery
    {
        public string? Query { get; set; }
    }

    public sealed class CreateTraceIdentityDto
    {
        public string IdentityCode { get; set; } = string.Empty; // serial/lot
        public string IdentityType { get; set; } = "serial";     // "serial" | "lot"
        public int ProductId { get; set; }
        public string? ProjectName { get; set; }
        public string? CurrentLocation { get; set; }
        public string? Status { get; set; }
    }

    public sealed class AppendTraceEventDto
    {
        public string EventType { get; set; } = "import";
        public DateTime? OccurredAt { get; set; }
        public string? RefCode { get; set; }
        public string? Actor { get; set; }
        public string? Note { get; set; }
    }
}
