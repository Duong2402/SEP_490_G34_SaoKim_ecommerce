using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services;
using SaoKim_ecommerce_BE.DTOs;


namespace SaoKim_ecommerce_BE.Services
{
    public interface IDispatchService
    {
        Task<DispatchSlipConfirmResultDto> ConfirmDispatchSlipAsync(int id);
        Task<PagedResult<DispatchSlipListItemDto>> GetDispatchSlipsAsync(DispatchSlipListQuery q);
        Task<List<CustomerLookupDto>> GetCustomersAsync(string? search);
        Task<List<ProjectLookupDto>> GetProjectsAsync(string? search);
        Task<RetailDispatch> CreateSalesDispatchAsync(RetailDispatchCreateDto dto);
        Task<ProjectDispatch> CreateProjectDispatchAsync(ProjectDispatchCreateDto dto);
        Task<DispatchSlipDetailDto?> GetDispatchByIdAsync(int id);
        Task<PagedResult<DispatchItemListItemDto>> GetDispatchItemsAsync(int id, DispatchItemListQuery q);
        Task<DispatchItemResultDto> CreateDispatchItemAsync(int dispatchId, DispatchItemDto dto);
        Task<(DispatchItem item, string productCode)> UpdateDispatchItemAsync(int itemId, DispatchItemDto dto);
        Task DeleteDispatchSlipAsync(int id); 
        Task DeleteDispatchItemAsync(int itemId);
        Task<byte[]> ExportDispatchSlipsAsync(List<int> ids, bool includeItems);
        Task<byte[]> ExportDispatchSlipPdfAsync(int id);
    }
}
