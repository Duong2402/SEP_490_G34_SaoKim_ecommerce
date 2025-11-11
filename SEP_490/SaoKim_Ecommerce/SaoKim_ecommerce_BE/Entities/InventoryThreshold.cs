namespace SaoKim_ecommerce_BE.Entities
{
    public class InventoryThreshold
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public int MinStock { get; set; } = 0;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

}
