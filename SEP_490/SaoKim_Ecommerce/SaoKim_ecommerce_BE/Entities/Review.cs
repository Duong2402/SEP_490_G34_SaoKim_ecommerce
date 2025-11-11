using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("reviews")]
    public class Review
    {
        [Key]
        [Column("review_id")]
        public int ReviewID { get; set; }

        [Required]
        [Column("product_id")]
        public int ProductID { get; set; }
        public Product? Product { get; set; }

        [Required]
        [Column("user_id")]
        public int UserID { get; set; }
        public User? User { get; set; }

        [Range(1, 5)]
        [Column("rating")]
        public int Rating { get; set; }

        [MaxLength(1000)]
        [Column("comment")]
        public string? Comment { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
