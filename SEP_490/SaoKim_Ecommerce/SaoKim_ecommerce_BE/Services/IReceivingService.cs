using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services;
using SaoKim_ecommerce_BE.DTOs;


namespace SaoKim_ecommerce_BE.Services
{
    public interface IReceivingService
    {
        Task<PagedResult<ReceivingSlipListItemDto>> GetReceivingSlipListAsync(ReceivingSlipListQuery q);
        Task<ReceivingSlip> CreateReceivingSlipAsync(ReceivingSlipCreateDto dto);
        Task<ReceivingSlipItem> UpdateReceivingSlipItemAsync(int itemId, ReceivingSlipItemDto dto);
        Task<ReceivingSlipItem> CreateReceivingSlipItemAsync(int slipId, ReceivingSlipItemDto dto);
        Task<(int SlipId, int ItemId)> DeleteReceivingSlipItemAsync(int itemId);
        Task<int> ImportReceivingSlipsAsync(Stream excelStream, string actor = "warehouse-manager");
        Task<ReceivingSlipConfirmResultDto> ConfirmReceivingSlipAsync(int id);
        Task<DispatchSlipConfirmResultDto> ConfirmDispatchSlipAsync(int id);
        Task<ReceivingSlip> UpdateSupplierAsync(int id, SupplierUpdateDto dto);
        Task<byte[]> ExportSelectedReceivingSlipsAsync(ReceivingExportRequestDto req);
    }
}
