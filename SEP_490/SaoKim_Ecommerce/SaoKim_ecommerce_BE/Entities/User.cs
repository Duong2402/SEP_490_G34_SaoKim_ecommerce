using DocumentFormat.OpenXml.Drawing.Charts;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("users")]
    public class User
    {
        [Key]
        [Column("user_id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int UserID { get; set; }

        [Column("name")]
        [Required, MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Column("email")]
        [Required, MaxLength(200)]
        public string Email { get; set; } = string.Empty;

        [Column("password")]
        [Required]
        public string Password { get; set; } = string.Empty;

        [Column("role_id")]
        public int RoleId { get; set; }

        [ForeignKey(nameof(RoleId))]
        public Role? Role { get; set; }

        [Column("phone_number")]
        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [Column("status")]
        [MaxLength(50)]
        public string? Status { get; set; }

        [Column("address")]
        [MaxLength(300)]
        public string? Address { get; set; }

        [Column("image")]
        [MaxLength(300)]
        public string? Image { get; set; }

        [Column("dob")]
        public DateTime? DOB { get; set; }

        [Column("create_at")]
        public DateTime CreateAt { get; set; } = DateTime.UtcNow;

        [Column("create_by")]
        [MaxLength(100)]
        public string? CreateBy { get; set; }

        [Column("update_by")]
        [MaxLength(100)]
        public string? UpdateBy { get; set; }

        [Column("update_at")]
        public DateTime? UpdateAt { get; set; }

        //customer
        [Column("is_banned")]
        public bool IsBanned { get; set; } = false;

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        public ICollection<Order> Orders { get; set; } = new List<Order>();

        public ICollection<CustomerNote> Notes { get; set; } = new List<CustomerNote>();
    }
}
