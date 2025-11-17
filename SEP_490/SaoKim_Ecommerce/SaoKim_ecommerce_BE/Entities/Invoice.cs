namespace SaoKim_ecommerce_BE.Entities
{
    public enum InvoiceStatus { Pending = 0, Paid = 1, Cancelled = 2 }

    public class Invoice
    {
        public int Id { get; set; }
        public string Code { get; set; } = default!;                  // INV-YYYYMMDD-###
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // “Customer” hiển thị ở FE
        public int? CustomerId { get; set; }
        public string? CustomerName { get; set; }     // => FE field: customer
        public string? Email { get; set; }            // => FE field: email
        public string? Phone { get; set; }            // => FE field: phone

        // optional: nếu là hoá đơn dự án
        public int? ProjectId { get; set; }
        public string? ProjectName { get; set; }

        // Tổng tiền
        public decimal Subtotal { get; set; }
        public decimal Discount { get; set; }         // thêm để FE hiển thị (nếu không dùng thì luôn = 0)
        public decimal Tax { get; set; }
        public decimal Total { get; set; }

        public InvoiceStatus Status { get; set; } = InvoiceStatus.Pending;

        public int? DispatchId { get; set; }          // tuỳ trường hợp dùng
        public List<InvoiceItem> Items { get; set; } = new();

        // PDF metadata
        public string? PdfFileName { get; set; }       // tên thực sự lưu trên đĩa (unique)
        public string? PdfOriginalName { get; set; }   // tên file gốc user upload
        public long? PdfSize { get; set; }           // byte
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
        public decimal Quantity { get; set; }      // FE mapping: qty
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }

        public string? OrderCode { get; set; }
    }
}
