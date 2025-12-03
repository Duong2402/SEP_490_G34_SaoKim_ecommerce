using System.ComponentModel.DataAnnotations;

namespace SaoKim_ecommerce_BE.Entities
{
    public enum DispatchStatus
    {
        Draft = 0,
        Confirmed = 1,
        Cancelled = 2
    }

    public abstract class DispatchBase
    {
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string ReferenceNo { get; set; } = string.Empty;

        [Required]
        public DateTime DispatchDate { get; set; } = DateTime.UtcNow;

        [MaxLength(500)]
        public string? Note { get; set; }

        public DispatchStatus Status { get; set; } = DispatchStatus.Draft;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ConfirmedAt { get; set; }
        public ICollection<DispatchItem> Items { get; set; } = new List<DispatchItem>();
        public abstract string Type { get; }
    }
    public class RetailDispatch : DispatchBase
    {
        [Required, MaxLength(200)]
        public string CustomerName { get; set; } = string.Empty;

        public int? CustomerId { get; set; }
        public override string Type => "Sales";
    }

    public class ProjectDispatch : DispatchBase
    {
        [Required, MaxLength(200)]
        public string ProjectName { get; set; } = string.Empty;

        public int? ProjectId { get; set; }
        public override string Type => "Project";
    }

    public class DispatchItem
    {
        public int Id { get; set; }
        public int DispatchId { get; set; }

        [Required, MaxLength(200)]
        public string ProductName { get; set; } = string.Empty;
        public int? ProductId { get; set; }

        [MaxLength(50)]
        public string Uom { get; set; } = "pcs";

        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }

        [Range(0, double.MaxValue)]
        public decimal UnitPrice { get; set; }
        public decimal Total { get; set; }

        public DispatchBase? Dispatch { get; set; }
    }
    public class OutboundReportQuery
    {
        public string? Customer { get; set; }
        public string? Project { get; set; }
        public string? Destination { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

}
