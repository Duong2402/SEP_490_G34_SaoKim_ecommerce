namespace SaoKim_ecommerce_BE.Entities
{
    public enum InvoiceStatus { Pending = 0, Paid = 1, Cancelled = 2 }

    public class Invoice
    {
        public int Id { get; set; }
        public string Code { get; set; } = default!;                  
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public int? ProjectId { get; set; }
        public string? ProjectName { get; set; }
        public decimal Subtotal { get; set; }
        public decimal Discount { get; set; }
        public decimal Tax { get; set; }
        public decimal Total { get; set; }
        public InvoiceStatus Status { get; set; } = InvoiceStatus.Pending;
        public int? DispatchId { get; set; }
        public List<InvoiceItem> Items { get; set; } = new();
        public string? PdfFileName { get; set; }
        public string? PdfOriginalName { get; set; }
        public long? PdfSize { get; set; }
        public DateTime? PdfUploadedAt { get; set; }
    }

    public class InvoiceItem
    {
        public int Id { get; set; }
        public int InvoiceId { get; set; }
        public Invoice Invoice { get; set; } = default!;
        public int? ProductId { get; set; }
        public string ProductName { get; set; } = default!;
        public string Uom { get; set; } = "pcs";
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
        public string? OrderCode { get; set; }
    }
}
