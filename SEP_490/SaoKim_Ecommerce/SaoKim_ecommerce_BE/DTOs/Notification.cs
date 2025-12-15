namespace SaoKim_ecommerce_BE.DTOs
{
    public class NotificationPushDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = null!;
        public string? Body { get; set; }
        public string? LinkUrl { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public string Type { get; set; } = "Promotion";
        public int? RefId { get; set; }
    }

}
