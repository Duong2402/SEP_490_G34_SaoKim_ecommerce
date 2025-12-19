namespace SaoKim_ecommerce_BE.DTOs
{
    public class ChatClickDto
    {
        public Guid SessionId { get; set; }
        public Guid? MessageId { get; set; }
        public int ProductId { get; set; }
    }
}
