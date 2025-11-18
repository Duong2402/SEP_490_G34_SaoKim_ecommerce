using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IProjectExpenseService
    {
        Task<ProjectExpenseListResult> QueryAsync(int projectId, ProjectExpenseQuery q);
        Task<ProjectExpenseListItemDTO?> GetAsync(int projectId, int id);
        Task<ProjectExpenseListItemDTO> CreateAsync(int projectId, ProjectExpenseCreateDTO dto, string? who);
        Task<ProjectExpenseListItemDTO?> UpdateAsync(int projectId, int id, ProjectExpenseUpdateDTO dto, string? who);
        Task<bool> DeleteAsync(int projectId, int id);
    }
}
