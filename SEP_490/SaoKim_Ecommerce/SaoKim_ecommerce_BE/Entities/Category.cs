using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("categories")]
    public class Category
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required, MaxLength(100)]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [MaxLength(120)]
        [Column("slug")]
        public string? Slug { get; set; }

        [Column("created")]
        public DateTime? Created { get; set; } = DateTime.UtcNow;

        public ICollection<ProductDetail> ProductDetails { get; set; }
    }
}
