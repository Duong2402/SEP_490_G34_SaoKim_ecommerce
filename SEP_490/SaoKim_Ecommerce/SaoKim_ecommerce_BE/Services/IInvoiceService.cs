using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IInvoiceService
    {
        Task<PagedResult<InvoiceListItemDto>> GetListAsync(InvoiceQuery query);
        Task<InvoiceDetailDto?> GetByIdAsync(int id);
        Task UpdateStatusAsync(int id, string status);
        Task DeleteAsync(int id);
        Task<byte[]> GeneratePdfAsync(int id, string folderPath);
        Task<string?> GetPdfPathAsync(int id, string folderPath);
        Task DeletePdfAsync(int id, string folderPath);
        Task SendInvoiceEmailAsync(int id, string pdfUrl);
    }
}
