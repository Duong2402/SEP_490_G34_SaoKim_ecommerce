namespace SaoKim_ecommerce_BE.DTOs
{
    public class ChatSessionUpsertDto
    {
        public Guid? SessionId { get; set; }
        public int? UserId { get; set; }
        public string? AnonymousId { get; set; }
        public string? Page { get; set; }
        public int? ProductId { get; set; }
        public int? CategoryId { get; set; }
    }
}
