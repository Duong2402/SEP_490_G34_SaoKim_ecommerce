using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("chat_messages")]
    public class ChatMessage
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("session_id")]
        public Guid SessionId { get; set; }

        [ForeignKey(nameof(SessionId))]
        public ChatSession? Session { get; set; }

        // "user" | "assistant"
        [Column("role")]
        [MaxLength(20)]
        public string Role { get; set; } = "user";

        [Column("text")]
        public string Text { get; set; } = "";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
