namespace SaoKim_ecommerce_BE.Entities
{
    public class PromotionProduct
    {
        public int Id { get; set; }

        public int PromotionId { get; set; }
        public int ProductId { get; set; }

        public string? Note { get; set; }

        public Promotion Promotion { get; set; } = null!;
        public Product Product { get; set; } = null!;
    }
}
