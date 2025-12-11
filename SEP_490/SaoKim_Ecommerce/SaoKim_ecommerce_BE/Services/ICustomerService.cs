using SaoKim_ecommerce_BE.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Services
{
    public interface ICustomerService
    {
        Task<(List<CustomerListItemDto> items, int total)> GetCustomersAsync(
            string? q,
            DateTime? createdFrom,
            DateTime? createdTo,
            decimal? minSpend,
            int? minOrders,
            string sortBy,
            string sortDir,
            int page,
            int pageSize);

        Task<CustomerDetailDto?> GetCustomerDetailAsync(int id);

        Task<CustomerNoteDto> AddNoteAsync(int customerId, int staffId, string content);

        Task<CustomerNoteDto?> UpdateNoteAsync(int customerId, int noteId, string content);

        Task<bool> DeleteNoteAsync(int customerId, int noteId);

        Task<bool> SoftDeleteCustomerAsync(int customerId, int staffId);

        Task<(byte[] content, string fileName)> ExportCustomersExcelAsync(
            string? q,
            DateTime? createdFrom,
            DateTime? createdTo);
    }
}
