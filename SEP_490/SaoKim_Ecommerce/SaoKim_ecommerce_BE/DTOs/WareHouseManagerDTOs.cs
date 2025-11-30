using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class ReceivingSlipCreateDto
    {
        public string Supplier { get; set; } = "";
        public DateTime ReceiptDate { get; set; }
        public string ReferenceNo { get; set; } = "";
        public string? Note { get; set; }
        public List<ReceivingSlipItemDto> Items { get; set; } = new();
    }

    public class ReceivingSlipItemDto
    {
        public int? ProductId { get; set; }
        public string ProductName { get; set; } = "";
        public string Uom { get; set; } = "unit";
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }
    public class ReceivingSlipListQuery
    {
        public string? Search { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public ReceivingSlipStatus? Status { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? SortBy { get; set; }
        public string? SortOrder { get; set; }
    }

    public class ReceivingSlipUpdateDto
    {
        public string Supplier { get; set; } = "";
        public DateTime ReceiptDate { get; set; }
        public string ReferenceNo { get; set; } = "";
        public string? Note { get; set; }
        public List<ReceivingSlipItemDto> Items { get; set; } = new();
    }

    public class InboundReportDto
    {
        public string? Supplier { get; set; }
        public string? Project { get; set; }
        public string? Source { get; set; }
        public DateTime? ReceiptDate { get; set; }
        public int TotalItems { get; set; }
        public decimal TotalQuantity { get; set; }
        public decimal TotalValue { get; set; }
    }

    public class InboundReportQuery
    {
        public string? Supplier { get; set; }
        public string? Project { get; set; }
        public string? Source { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class SupplierUpdateDto
    {
        public string Supplier { get; set; } = "";
    }

    public class RetailDispatchCreateDto
    {
        public DateTime DispatchDate { get; set; } = DateTime.UtcNow;
        public string CustomerName { get; set; } = "";
        public int? CustomerId { get; set; }
        public string? Note { get; set; }
    }

    public class ProjectDispatchCreateDto
    {
        public DateTime DispatchDate { get; set; } = DateTime.UtcNow;
        public string ProjectName { get; set; } = "";
        public int? ProjectId { get; set; }
        public string? Note { get; set; }
    }

    public class DispatchItemDto
    {
        public int? Id { get; set; }
        public int? ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string Uom { get; set; } = "pcs";
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public string? Note { get; set; }
    }

    public class DispatchSlipListQuery
    {
        public string? Type { get; set; }
        public string? Search { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? SortBy { get; set; }
        public string? SortOrder { get; set; } = "desc";
    }

    public class DispatchItemListQuery
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    public class ReceivingSlipListItemDto
    {
        public int Id { get; set; }
        public string ReferenceNo { get; set; } = "";
        public string Supplier { get; set; } = "";
        public DateTime ReceiptDate { get; set; }
        public ReceivingSlipStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ConfirmedAt { get; set; }
    }

    public class ReceivingExportRequestDto
    {
        public List<int> Ids { get; set; } = new();
        public bool IncludeItems { get; set; } = true;
    }
}

public class ReceivingSlipConfirmResultDto
{
    public int Id { get; set; }
    public string ReferenceNo { get; set; } = "";
    public ReceivingSlipStatus Status { get; set; }
    public DateTime? ConfirmedAt { get; set; }

    public string Supplier { get; set; } = "";
    public DateTime ReceiptDate { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<ReceivingSlipConfirmProductDto> AffectedProducts { get; set; }
        = new();
}

public class ReceivingSlipConfirmProductDto
{
    public int ProductId { get; set; }
    public int AddedQty { get; set; }
}

public class DispatchSlipConfirmProductDto
{
    public int ProductId { get; set; }
    public int DeductedQty { get; set; }
}

public class DispatchSlipConfirmResultDto
{
    public int Id { get; set; }
    public string ReferenceNo { get; set; } = "";
    public DispatchStatus Status { get; set; }
    public DateTime? ConfirmedAt { get; set; }

    public DateTime DispatchDate { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<DispatchSlipConfirmProductDto> AffectedProducts { get; set; }
        = new();
}

public class OutboundReportDto
{
    public string? CustomerName { get; set; }
    public string? ProjectName { get; set; }
    public string? ReferenceNo { get; set; }

    public DateTime IssueDate { get; set; }
    public string? Note { get; set; }
    public int TotalItems { get; set; }
    public int TotalQuantity { get; set; }
    public decimal TotalValue { get; set; }
}

public class OutboundReportQuery
{
    public string? Destination { get; set; }
    public string? Customer { get; set; }
    public string? Project { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

public class DispatchSlipListItemDto
{
    public int Id { get; set; }
    public string Type { get; set; } = "";
    public string ReferenceNo { get; set; } = "";
    public string? SalesOrderNo { get; set; }
    public string? RequestNo { get; set; }
    public string? CustomerName { get; set; }
    public string? ProjectName { get; set; }
    public DateTime DispatchDate { get; set; }
    public DispatchStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public string? Note { get; set; }
}
public class WeeklyInboundSummaryDto
{
    public int ThisWeek { get; set; }
    public int LastWeek { get; set; }
}
public class WeeklySummaryDto
{
    public int ThisWeek { get; set; }
    public int LastWeek { get; set; }
}

public class TotalStockDto
{
    public decimal TotalStock { get; set; }
}

public class UnitOfMeasureDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
}

public class CustomerLookupDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
}

public class ProjectLookupDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
}

public class DispatchSlipDetailDto
{
    public int Id { get; set; }
    public string ReferenceNo { get; set; } = "";
    public string Type { get; set; } = "";
    public DispatchStatus Status { get; set; }
    public DateTime DispatchDate { get; set; }
    public string? Note { get; set; }

    public string? CustomerName { get; set; }
    public int? CustomerId { get; set; }
    public string? ProjectName { get; set; }
    public int? ProjectId { get; set; }
}

public class DispatchItemListItemDto
{
    public int Id { get; set; }
    public int DispatchId { get; set; }
    public int? ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public string? ProductCode { get; set; }
    public string Uom { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Total { get; set; }
}

public class DispatchItemResultDto
{
    public int Id { get; set; }
    public int DispatchId { get; set; }
    public int? ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public string Uom { get; set; } = "pcs";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Total { get; set; }
}

public sealed class InventoryListQuery
{
    public string? Search { get; set; }
    public string? Status { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class InventoryListItemDto
{
    public int ProductId { get; set; }
    public string? ProductCode { get; set; }
    public string ProductName { get; set; } = "";
    public decimal OnHand { get; set; }
    public string? UomName { get; set; }
    public int MinStock { get; set; }
    public string? Status { get; set; }
    public string? Note { get; set; }
}
public class InventoryReportItemDto
{
    public int ProductId { get; set; }
    public string? ProductCode { get; set; }
    public string ProductName { get; set; } = "";

    public decimal OnHand { get; set; }
    public string? UomName { get; set; }
    public int MinStock { get; set; }
    public string Status { get; set; } = "stock";
    public string? Note { get; set; }

    public decimal OpeningQty { get; set; }
    public decimal InboundQty { get; set; }
    public decimal OutboundQty { get; set; }
    public decimal ClosingQty { get; set; }
}
public class UpdateMinStockDto
{
    public int MinStock { get; set; }
}