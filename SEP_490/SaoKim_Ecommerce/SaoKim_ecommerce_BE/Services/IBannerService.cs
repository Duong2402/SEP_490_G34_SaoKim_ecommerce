using SaoKim_ecommerce_BE.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IBannerService
    {
        Task<IReadOnlyList<Banner>> GetAllAsync();
        Task<Banner?> GetByIdAsync(int id);
        Task<Banner> CreateAsync(Banner model);
        Task<Banner?> UpdateAsync(int id, Banner model);
        Task<bool> DeleteAsync(int id);
    }
}
