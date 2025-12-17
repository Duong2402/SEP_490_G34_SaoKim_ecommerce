using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    [Table("InventoryStockSnapshots")]
    public class InventoryStockSnapshot
    {
        [Key] public long Id { get; set; }
        public int ProductId { get; set; }
        public DateTime SnapshotAt { get; set; }
        public decimal OnHand { get; set; }

        [MaxLength(50)] public string RefType { get; set; } = "";
        public long RefId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

}
