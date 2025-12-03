using SaoKim_ecommerce_BE.Entities;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("user_addresses")]
public class Address
{
    [Key]
    [Column("address_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int AddressId { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [MaxLength(200)]
    [Column("recipient_name")]
    public string RecipientName { get; set; } = string.Empty;

    [MaxLength(20)]
    [Column("phone_number")]
    public string PhoneNumber { get; set; } = string.Empty;

    [MaxLength(300)]
    [Column("line1")]
    public string Line1 { get; set; } = string.Empty;

    [Column("ward")]
    [MaxLength(200)]
    public string? Ward { get; set; }

    [MaxLength(100)]
    [Column("district")]
    public string? District { get; set; }

    [MaxLength(100)]
    [Column("province")]
    public string? Province { get; set; }

    [Column("latitude")]
    public double? Latitude { get; set; }

    [Column("longitude")]
    public double? Longitude { get; set; }

    [Column("is_default")]
    public bool IsDefault { get; set; } = false;

    [Column("create_at")]
    public DateTime CreateAt { get; set; } = DateTime.UtcNow;

    [Column("update_at")]
    public DateTime? UpdateAt { get; set; }
}
