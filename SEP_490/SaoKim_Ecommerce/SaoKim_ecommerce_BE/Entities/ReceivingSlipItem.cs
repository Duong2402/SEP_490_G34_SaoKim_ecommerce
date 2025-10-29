using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    public class ReceivingSlipItem
    {
        public int Id { get; set; }

        [ForeignKey(nameof(ReceivingSlip))]
        public int ReceivingSlipId { get; set; }
        public ReceivingSlip ReceivingSlip { get; set; } = null!;

        [ForeignKey(nameof(Product))]
        public int? ProductId { get; set; }
        public Product? Product { get; set; }

        [Required, MaxLength(200)]
        public string ProductName { get; set; } = "";

        [Required, MaxLength(50)]
        public string Uom { get; set; } = "unit";
        public int Quantity { get; set; }

        public decimal UnitPrice { get; set; }
        public decimal Total { get; set; }
    }
}
