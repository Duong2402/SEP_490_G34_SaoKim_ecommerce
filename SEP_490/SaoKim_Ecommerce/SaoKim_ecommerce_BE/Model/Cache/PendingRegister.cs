namespace SaoKim_ecommerce_BE.Model.Cache
{
    public class PendingRegister
    {
        public string Email { get; set; } = "";
        public string Name { get; set; } = "";
        public string PasswordHash { get; set; } = "";
        public string? Image { get; set; }

        public string Code { get; set; } = "";
        public DateTime ExpiresAtUtc { get; set; }
        public int AttemptsLeft { get; set; } = 5;
    }
}
