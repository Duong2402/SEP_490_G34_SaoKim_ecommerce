using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IProjectExpenseService
    {
        /// <summary>
        /// Truy vấn danh sách chi phí theo dự án, hỗ trợ phân trang và lọc.
        /// </summary>
        Task<ProjectExpenseListResult> QueryAsync(int projectId, ProjectExpenseQuery q);

        /// <summary>
        /// Lấy chi tiết 1 expense theo id trong dự án.
        /// </summary>
        Task<ProjectExpenseListItemDTO?> GetAsync(int projectId, int id);

        /// <summary>
        /// Tạo mới một expense.
        /// </summary>
        Task<ProjectExpenseListItemDTO> CreateAsync(int projectId, ProjectExpenseCreateDTO dto, string? who);

        /// <summary>
        /// Cập nhật một expense.
        /// </summary>
        Task<ProjectExpenseListItemDTO?> UpdateAsync(int projectId, int id, ProjectExpenseUpdateDTO dto, string? who);

        /// <summary>
        /// Xóa một expense.
        /// </summary>
        Task<bool> DeleteAsync(int projectId, int id);
    }
}
