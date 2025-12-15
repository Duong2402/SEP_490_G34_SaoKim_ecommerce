using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IProjectReportsService
    {
        Task<ProjectReportDTOs?> GetProjectReportAsync(int projectId);
        Task<byte[]?> GetProjectReportPdfAsync(int projectId);
    }
}
