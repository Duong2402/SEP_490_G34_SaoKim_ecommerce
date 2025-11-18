namespace SaoKim_ecommerce_BE.Entities
{
    public class TraceEvent
    {
        public int Id { get; set; }
        public int TraceIdentityId { get; set; }
        public TraceIdentity? TraceIdentity { get; set; }
        public string EventType { get; set; } = "import";
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
        public string? RefCode { get; set; }
        public string? Actor { get; set; }
        public string? Note { get; set; }

    }
}
