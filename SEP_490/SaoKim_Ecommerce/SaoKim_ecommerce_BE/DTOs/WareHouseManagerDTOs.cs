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
        public int PageSize { get; set; } = 20;
    }

    public class ReceivingSlipUpdateDto
    {
        public string Supplier { get; set; } = "";
        public DateTime ReceiptDate { get; set; }
        public string ReferenceNo { get; set; } = "";
        public string? Note { get; set; }
        public List<ReceivingSlipItemDto> Items { get; set; } = new();
    }
}
