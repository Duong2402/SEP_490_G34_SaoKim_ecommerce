using System.ComponentModel.DataAnnotations;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class ProjectProductCreateDTO
    {
        [Required] public int ProductId { get; set; }
        [Required, Range(0.0001, double.MaxValue)] public decimal Quantity { get; set; }
        [Range(0, double.MaxValue)] public decimal? UnitPrice { get; set; } 
        [MaxLength(500)] public string? Note { get; set; }
    }

    public class ProjectProductUpdateDTO
    {
        [Required, Range(0.0001, double.MaxValue)] public decimal Quantity { get; set; }
        [Required, Range(0, double.MaxValue)] public decimal UnitPrice { get; set; }
        [MaxLength(500)] public string? Note { get; set; }
    }

    public class ProjectProductItemDTO
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = default!;
        public string Uom { get; set; } = "pcs";
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Total { get; set; }
        public string? Note { get; set; }
    }

    public class ProjectProductListDTO
    {
        public int ProjectId { get; set; }
        public IEnumerable<ProjectProductItemDTO> Items { get; set; } = Array.Empty<ProjectProductItemDTO>();
        public decimal Subtotal { get; set; }
    }
}
