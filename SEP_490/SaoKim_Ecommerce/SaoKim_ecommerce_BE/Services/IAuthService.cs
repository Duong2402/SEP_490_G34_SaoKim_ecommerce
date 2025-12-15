using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models.Requests;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IAuthService
    {
        Task<RegisterResponse> RegisterAsync(RegisterRequest req);
        Task<LoginResponse> LoginAsync(LoginRequest req);
        Task ForgotPasswordAsync(ForgotPasswordRequest req);
        Task ResetPasswordAsync(ResetPasswordRequest req);
        Task ChangePasswordAsync(string? emailFromToken, ChangePasswordRequest req);
    }
}
