using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IWarehouseReportService
    {
        Task<List<InboundReportDto>> GetInboundReportAsync(InboundReportQuery q);
        Task<List<OutboundReportDto>> GetOutboundReportAsync(OutboundReportQuery q);
        Task<WeeklyInboundSummaryDto> GetWeeklyInboundSummaryAsync();
        Task<WeeklySummaryDto> GetWeeklyOutboundSummaryAsync();
        Task<TotalStockDto> GetTotalStockAsync();
        Task<List<UnitOfMeasureDto>> GetUnitOfMeasuresAsync();
        Task<PagedResult<InventoryListItemDto>> GetInventoryAsync(InventoryListQuery q);
        Task<PagedResult<InventoryReportItemDto>> GetInventoryReportAsync(InventoryListQuery q);
        Task<InventoryThreshold> UpdateMinStockAsync(int productId, int minStock);
        Task<List<TraceSearchResultDto>> SearchTraceAsync(TraceSearchQuery query);
        Task<ProductTraceDto?> GetProductTraceAsync(int productId);
    }
}
