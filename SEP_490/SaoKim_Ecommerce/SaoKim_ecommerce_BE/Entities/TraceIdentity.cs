namespace SaoKim_ecommerce_BE.Entities
{
    public class TraceIdentity
    {
        public int Id { get; set; }

        public string IdentityCode { get; set; } = string.Empty; // unique
        public string IdentityType { get; set; } = "serial";     // "serial" | "lot"

        public int ProductId { get; set; }
        public Product? Product { get; set; }

        public string Status { get; set; } = "Unknown";
        public string? CurrentLocation { get; set; }
        public string? ProjectName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public List<TraceEvent> Events { get; set; } = new();
    }
}
