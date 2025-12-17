namespace SaoKim_ecommerce_BE.Model.Requests
{
    public class VerifyRegisterRequest
    {
        public string Email { get; set; } = "";
        public string Code { get; set; } = "";
    }
}
