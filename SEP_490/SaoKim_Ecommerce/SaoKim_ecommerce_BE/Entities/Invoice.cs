using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaoKim_ecommerce_BE.Entities
{
    public enum InvoiceStatus { Pending = 0, Paid = 1, Cancelled = 2 }

    [Table("invoices")]
    public class Invoice
    {
        public int Id { get; set; }

        [Column("code")]
        public string Code { get; set; } = default!;                  // INV-YYYYMMDD-###

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // FK sang users (customer)
        [Column("customer_id")]
        public int? CustomerId { get; set; }

        [ForeignKey(nameof(CustomerId))]
        public User? Customer { get; set; }

        // optional: nếu muốn gắn 1–1 với Order
        [Column("order_id")]
        public int? OrderId { get; set; }

        [ForeignKey(nameof(OrderId))]
        public Order? Order { get; set; }

        // “Customer” hiển thị ở FE
        [Column("customer_name")]
        public string? CustomerName { get; set; }     // => FE field: customer

        [Column("email")]
        public string? Email { get; set; }            // => FE field: email

        [Column("phone")]
        public string? Phone { get; set; }            // => FE field: phone

        // optional: nếu là hoá đơn dự án
        [Column("project_id")]
        public int? ProjectId { get; set; }

        [Column("project_name")]
        public string? ProjectName { get; set; }

        // Tổng tiền
        [Column("subtotal")]
        public decimal Subtotal { get; set; }

        [Column("discount")]
        public decimal Discount { get; set; }

        [Column("tax")]
        public decimal Tax { get; set; }

        [Column("total")]
        public decimal Total { get; set; }

        [Column("status")]
        public InvoiceStatus Status { get; set; } = InvoiceStatus.Pending;

        [Column("dispatch_id")]
        public int? DispatchId { get; set; }

        public List<InvoiceItem> Items { get; set; } = new();

        // PDF metadata
        [Column("pdf_file_name")]
        public string? PdfFileName { get; set; }

        [Column("pdf_original_name")]
        public string? PdfOriginalName { get; set; }

        [Column("pdf_size")]
        public long? PdfSize { get; set; }

        [Column("pdf_uploaded_at")]
        public DateTime? PdfUploadedAt { get; set; }
    }

    [Table("invoice_items")]
    public class InvoiceItem
    {
        public int Id { get; set; }

        [Column("invoice_id")]
        public int InvoiceId { get; set; }
        public Invoice Invoice { get; set; } = default!;

        [Column("product_id")]
        public int? ProductId { get; set; }

        [Column("product_name")]
        public string ProductName { get; set; } = default!;

        [Column("uom")]
        public string Uom { get; set; } = "pcs";

        [Column("quantity")]
        public decimal Quantity { get; set; }      // FE mapping: qty

        [Column("unit_price")]
        public decimal UnitPrice { get; set; }

        [Column("line_total")]
        public decimal LineTotal { get; set; }

        [Column("order_code")]
        public string? OrderCode { get; set; }
    }
}
