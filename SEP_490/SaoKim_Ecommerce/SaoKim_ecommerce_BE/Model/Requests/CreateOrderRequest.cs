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
        /// Nếu null -> dùng địa chỉ mặc định của user, nếu vẫn không có thì fallback sang user.Address.
        /// </summary>
        public int? AddressId { get; set; }

        /// <summary>
        /// Phương thức thanh toán: COD, BANK_TRANSFER_QR, QR, ...
        /// </summary>
        [Required]
        [StringLength(50)]
        public string PaymentMethod { get; set; } = "COD";

        /// <summary>
        /// Mã giao dịch (khi thanh toán QR/chuyển khoản).
        /// </summary>
        [StringLength(100)]
        public string? PaymentTransactionCode { get; set; }

        /// <summary>
        /// Ghi chú đơn hàng.
        /// </summary>
        [StringLength(500)]
        public string? Note { get; set; }

        // Danh sách sản phẩm trong đơn hàng
        [Required]
        [MinLength(1)]
        public List<CreateOrderItemRequest> Items { get; set; } = new();
    }
}
