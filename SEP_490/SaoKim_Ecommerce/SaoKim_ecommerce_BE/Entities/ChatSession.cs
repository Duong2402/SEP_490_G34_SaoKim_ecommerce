using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("chat_sessions")]
    public class ChatSession
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("user_id")]
        public int? UserId { get; set; }

        [Column("anonymous_id")]
        [MaxLength(100)]
        public string? AnonymousId { get; set; }

        [Column("started_at")]
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;

        [Column("last_message_at")]
        public DateTime? LastMessageAt { get; set; }

        [Column("page")]
        [MaxLength(200)]
        public string? Page { get; set; }

        [Column("product_id")]
        public int? ProductId { get; set; }

        [Column("category_id")]
        public int? CategoryId { get; set; }

        public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
        public ICollection<ChatBotEvent> Events { get; set; } = new List<ChatBotEvent>();
        public ICollection<ChatProductClick> ProductClicks { get; set; } = new List<ChatProductClick>();
    }
}
