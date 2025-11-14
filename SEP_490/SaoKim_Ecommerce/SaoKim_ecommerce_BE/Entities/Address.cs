using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
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

        // Thông tin người nhận
        [MaxLength(200)]
        [Column("recipient_name")]
        public string RecipientName { get; set; } = string.Empty;

        [MaxLength(20)]
        [Column("phone_number")]
        public string PhoneNumber { get; set; } = string.Empty;

        // Địa chỉ cụ thể
        [MaxLength(300)]
        [Column("line1")]
        public string Line1 { get; set; } = string.Empty;

        [MaxLength(200)]
        [Column("line2")]
        public string? Line2 { get; set; }

        [MaxLength(100)]
        [Column("ward")]
        public string? Ward { get; set; }

        [MaxLength(100)]
        [Column("district")]
        public string? District { get; set; }

        [MaxLength(100)]
        [Column("province")]
        public string? Province { get; set; }

        // Cờ địa chỉ mặc định
        [Column("is_default")]
        public bool IsDefault { get; set; } = false;

        // Thời gian tạo & cập nhật
        [Column("create_at")]
        public DateTime CreateAt { get; set; } = DateTime.UtcNow;

        [Column("update_at")]
        public DateTime? UpdateAt { get; set; }
    }
}
