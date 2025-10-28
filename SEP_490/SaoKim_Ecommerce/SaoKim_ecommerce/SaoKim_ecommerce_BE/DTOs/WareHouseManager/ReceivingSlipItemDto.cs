public class ReceivingSlipItemDto
{
    public int? ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public string Uom { get; set; } = "unit";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}