using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IProjectProductService
    {
        Task<ProjectProductListDTO> GetProductsAsync(int projectId);
        Task<ProjectProductItemDTO> AddProductAsync(int projectId, ProjectProductCreateDTO dto);
        Task<ProjectProductItemDTO?> UpdateProductAsync(int projectId, int projectProductId, ProjectProductUpdateDTO dto);
        Task<bool> RemoveProductAsync(int projectId, int projectProductId);
    }
}
