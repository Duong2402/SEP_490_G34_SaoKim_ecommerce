using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models.Requests;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IAddressesService
    {
        Task<IReadOnlyList<AddressResponse>> GetMineAsync(int userId);
        Task<AddressResponse> CreateAsync(int userId, CreateAddressRequest req);
        Task UpdateAsync(int userId, int addressId, AddressUpdateRequest req);
        Task SetDefaultAsync(int userId, int addressId);
        Task DeleteAsync(int userId, int addressId);
    }
}
