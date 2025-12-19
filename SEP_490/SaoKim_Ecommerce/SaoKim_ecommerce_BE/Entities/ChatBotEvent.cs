using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("chat_bot_events")]
    public class ChatBotEvent
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("session_id")]
        public Guid SessionId { get; set; }

        [ForeignKey(nameof(SessionId))]
        public ChatSession? Session { get; set; }

        [Column("message_id")]
        public Guid? MessageId { get; set; }

        [Column("user_message")]
        public string? UserMessage { get; set; }

        [Column("detected_intent")]
        [MaxLength(80)]
        public string? DetectedIntent { get; set; }

        [Column("tool_name")]
        [MaxLength(80)]
        public string? ToolName { get; set; }

        // jsonb
        [Column("tool_args", TypeName = "jsonb")]
        public string? ToolArgs { get; set; }

        [Column("tool_result_count")]
        public int? ToolResultCount { get; set; }

        [Column("response_text")]
        public string? ResponseText { get; set; }

        // "Faq" | "ToolSearch" | "Similar" | "FreeText" | "NoResult"
        [Column("response_type")]
        [MaxLength(30)]
        public string ResponseType { get; set; } = "FreeText";

        [Column("latency_ms")]
        public int? LatencyMs { get; set; }

        [Column("model")]
        [MaxLength(60)]
        public string? Model { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
