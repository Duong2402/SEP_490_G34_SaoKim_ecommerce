using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("chat_product_clicks")]
    public class ChatProductClick
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

        [Column("product_id")]
        public int ProductId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
