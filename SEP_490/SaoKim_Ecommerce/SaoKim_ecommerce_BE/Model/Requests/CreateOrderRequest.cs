using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SaoKim_ecommerce_BE.Models.Requests
{
    public class CreateOrderItemRequest
    {
        [Required]
        public int ProductId { get; set; }

        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }

    public class CreateOrderRequest
    {
        /// <summary>
        /// Id của địa chỉ giao hàng (user_addresses.address_id).
        /// Nếu null -> sử dụng địa chỉ mặc định / gần nhất.
        /// </summary>
        public int? AddressId { get; set; }

        /// <summary>
        /// Phương thức thanh toán: COD, BANK_TRANSFER_QR, ...
        /// </summary>
        [Required]
        [StringLength(50)]
        public string PaymentMethod { get; set; } = "COD";

        /// <summary>
        /// Mã giao dịch (nếu đã thanh toán trước).
        /// </summary>
        [StringLength(100)]
        public string? PaymentTransactionCode { get; set; }

        /// <summary>
        /// Mã giảm giá mà khách nhập (nếu có).
        /// </summary>
        [StringLength(64)]
        public string? CouponCode { get; set; }

        /// <summary>
        /// Ghi chú đơn hàng.
        /// </summary>
        [StringLength(500)]
        public string? Note { get; set; }

        /// <summary>
        /// Danh sách sản phẩm trong đơn hàng.
        /// </summary>
        [Required]
        [MinLength(1)]
        public List<CreateOrderItemRequest> Items { get; set; } = new();
    }
}
