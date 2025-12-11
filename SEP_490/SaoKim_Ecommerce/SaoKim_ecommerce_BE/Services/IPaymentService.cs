using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IPaymentService
    {
        Task<VietQrCheckResultDto> CheckVietQrAsync(int amount, CancellationToken cancellationToken = default);
    }
}
