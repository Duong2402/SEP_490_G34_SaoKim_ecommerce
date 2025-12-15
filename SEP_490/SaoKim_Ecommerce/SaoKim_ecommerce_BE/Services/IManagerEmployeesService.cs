using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IManagerEmployeesService
    {
        Task<(List<EmployeeListItemDto> items, int total)> GetAllAsync(
            string? q,
            string? role,
            string? status,
            int page,
            int pageSize);

        Task<EmployeeDetailDto?> GetByIdAsync(int id);

        Task<int> CreateEmployeeAsync(EmployeeCreateDto dto);

        Task UpdateEmployeeAsync(int id, EmployeeUpdateDto dto);

        Task DeleteEmployeeAsync(int id);

        Task<List<RoleItemDto>> GetRolesAsync();
    }
}
