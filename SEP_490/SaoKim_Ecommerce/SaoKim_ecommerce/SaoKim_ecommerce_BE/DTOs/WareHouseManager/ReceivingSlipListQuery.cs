using SaoKim_ecommerce_BE.Entities;

public class ReceivingSlipListQuery
{
    public string? Search { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public ReceivingSlipStatus? Status { get; set; } // 0 Draft, 1 Confirmed
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}