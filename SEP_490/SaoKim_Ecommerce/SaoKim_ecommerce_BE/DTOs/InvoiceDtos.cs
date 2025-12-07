using Microsoft.AspNetCore.Mvc;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class InvoiceListItemDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = default!;
        public string? Customer { get; set; }   
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public decimal Total { get; set; }
        public string Status { get; set; } = "Pending";
        public DateTime Created { get; set; }   

        public bool HasPdf { get; set; }
        public string? PdfOriginalName { get; set; }   
        public DateTime? PdfUploadedAt { get; set; }
    }

    public class InvoiceDetailDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = default!;
        public string? Customer { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }

        public decimal Subtotal { get; set; }
        public decimal Discount { get; set; }
        public decimal Tax { get; set; }
        public decimal Total { get; set; }

        public string Status { get; set; } = "Pending";
        public DateTime Created { get; set; }
        public IEnumerable<InvoiceItemDto> Items { get; set; } = new List<InvoiceItemDto>();
    }

    public class InvoiceItemDto
    {
        public string ProductName { get; set; } = default!;
        public string Uom { get; set; } = "pcs";
        public decimal Qty { get; set; }           
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
    }

    public class InvoiceQuery   
    {
        [FromQuery(Name = "q")]
        public string? Q { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? SortBy { get; set; } = "created"; 
        public string? SortDir { get; set; } = "desc";
        public string? Status { get; set; }              
    }

    public class UpdateInvoiceStatusDto
    {
        public string Status { get; set; } = default!;
    }
}
