using SaoKim_ecommerce_BE.Entities;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("user_notifications")]
public class UserNotification
{
    [Key]
    [Column("user_notification_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int UserNotificationId { get; set; }

    [Column("user_id")]
    public int UserID { get; set; }

    [Column("notification_id")]
    public int NotificationId { get; set; }

    [Column("is_read")]
    public bool IsRead { get; set; } = false;

    [Column("read_at")]
    public DateTime? ReadAt { get; set; }

    [ForeignKey(nameof(NotificationId))]
    public Notification Notification { get; set; } = null!;
}
