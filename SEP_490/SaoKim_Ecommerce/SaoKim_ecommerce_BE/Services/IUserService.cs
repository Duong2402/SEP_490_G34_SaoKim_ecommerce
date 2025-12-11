using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IUserService
    {
        Task<PagedResult<UserListItemDto>> GetAllAsync(
            string? q,
            string? role,
            string? status,
            int page,
            int pageSize);

        Task<IReadOnlyList<ProjectManagerOptionDTO>> GetProjectManagersAsync();

        Task<UserDetailDto?> GetByIdAsync(int id);

        Task<bool> UpdateUserAsync(int id, UserUpdateDto dto);

        Task<IReadOnlyList<RoleItemDto>> GetRolesAsync();

        Task<UserDetailDto?> GetMeAsync(string email);

        Task<bool> UpdateMeAsync(string email, UpdateProfileDto dto, string uploadsRoot);
    }
}
