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

    public class ReceivingExportRequestDto
    {
        public List<int> Ids { get; set; } = new();
        public bool IncludeItems { get; set; } = true;
    }
}
