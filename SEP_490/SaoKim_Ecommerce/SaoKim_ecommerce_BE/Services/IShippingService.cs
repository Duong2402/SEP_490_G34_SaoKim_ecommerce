using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IShippingService
    {
        Task<ShippingFeeResultDto?> GetFeeAsync(int addressId, string method);
        Task<ShippingDebugResultDto?> DebugAddressAsync(int addressId);
    }
}
