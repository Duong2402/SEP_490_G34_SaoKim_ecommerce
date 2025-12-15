using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("notifications")]
    public class Notification
    {
        [Key]
        [Column("notification_id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int NotificationId { get; set; }

        [Required]
        [Column("title")]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Column("body")]
        public string? Body { get; set; }

        [Column("type")]
        [MaxLength(50)]
        [Required]
        public string Type { get; set; } = null!;

        [Column("link_url")]
        [MaxLength(300)]
        public string? LinkUrl { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<UserNotification> UserNotifications { get; set; } = new List<UserNotification>();
    }
}