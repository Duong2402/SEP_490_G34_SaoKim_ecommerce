using Microsoft.Extensions.Caching.Memory;
using System;

namespace SaoKim_ecommerce_BE.Services
{
    public class PasswordResetService : IPasswordResetService
    {
        private readonly IMemoryCache _cache;

        public PasswordResetService(IMemoryCache cache)
        {
            _cache = cache;
        }

        public string GenerateCode(string email, TimeSpan ttl)
        {
            var rng = new Random();
            var code = rng.Next(100000, 999999).ToString();

            var options = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ttl
            };

            _cache.Set(GetKey(email), code, options);
            return code;
        }

        public bool VerifyCode(string email, string code)
        {
            if (_cache.TryGetValue(GetKey(email), out string stored))
            {
                if (stored == code)
                {
                    _cache.Remove(GetKey(email));
                    return true;
                }
            }
            return false;
        }

        public void RemoveCode(string email)
        {
            _cache.Remove(GetKey(email));
        }

        private string GetKey(string email)
            => $"pwdreset:{email.ToLowerInvariant()}";
    }
}
