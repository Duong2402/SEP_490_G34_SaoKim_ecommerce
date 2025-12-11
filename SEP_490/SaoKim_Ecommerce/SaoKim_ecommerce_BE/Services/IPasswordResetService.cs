using System;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IPasswordResetService
    {
        string GenerateCode(string email, TimeSpan ttl);
        bool VerifyCode(string email, string code);
        void RemoveCode(string email);
    }
}
