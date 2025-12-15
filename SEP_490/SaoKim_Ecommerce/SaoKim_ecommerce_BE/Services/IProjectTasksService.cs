using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IProjectTasksService
    {
        Task<IEnumerable<TaskDTO>> GetTasksAsync(int projectId);
        Task<TaskDTO?> GetTaskByIdAsync(int projectId, int taskId);
        Task<TaskDTO> CreateTaskAsync(int projectId, TaskCreateUpdateDTO dto);
        Task<bool> UpdateTaskAsync(int projectId, int taskId, TaskCreateUpdateDTO dto);
        Task<bool> DeleteTaskAsync(int projectId, int taskId);
    }
}
