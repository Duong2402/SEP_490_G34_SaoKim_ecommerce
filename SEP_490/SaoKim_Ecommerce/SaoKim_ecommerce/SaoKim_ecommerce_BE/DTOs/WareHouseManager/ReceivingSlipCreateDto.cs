
namespace SaoKim_ecommerce_BE.DTOs.WareHouseManager
{
    public class ReceivingSlipCreateDto
    {
        public string Supplier { get; set; } = "";
        public DateTime ReceiptDate { get; set; }
        public string ReferenceNo { get; set; } = "";
        public string? Note { get; set; }
        public List<ReceivingSlipItemDto> Items { get; set; } = new();
    }
}