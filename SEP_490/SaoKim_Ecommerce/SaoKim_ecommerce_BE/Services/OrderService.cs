using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models.Requests;

namespace SaoKim_ecommerce_BE.Services
{
    public class OrdersService : IOrdersService
    {
        private readonly SaoKimDBContext _db;
        private readonly ILogger<OrdersService> _logger;
        private readonly IDispatchService _dispatchService;
        private readonly ICouponService _couponService;
        private readonly decimal _vatPercent;
        private readonly INotificationService _notificationService;
        public OrdersService(
            SaoKimDBContext db,
            ILogger<OrdersService> logger,
            IDispatchService dispatchService,
            ICouponService couponService,
            IConfiguration config,
            INotificationService notificationService)
        {
            _db = db;
            _logger = logger;
            _dispatchService = dispatchService;
            _couponService = couponService;
            _vatPercent = config.GetValue<decimal>("VAT:Value") / 100;
            _notificationService = notificationService;
        }

        public async Task<OrderCreateResultDto> CreateOrderAsync(CreateOrderRequest request, User user)
        {
            if (request.Items == null || request.Items.Count == 0)
                throw new InvalidOperationException("Đơn hàng phải có ít nhất 1 sản phẩm");

            var address = await ResolveShippingAddressAsync(request, user);

            if (address == null && string.IsNullOrWhiteSpace(user.Address))
            {
                throw new InvalidOperationException(
                    "Không tìm thấy địa chỉ giao hàng. Vui lòng thêm địa chỉ giao hàng trước khi đặt hàng.");
            }

            string shippingRecipientName;
            string shippingPhoneNumber;
            string shippingLine1;
            string? shippingWard = null;
            string? shippingDistrict = null;
            string? shippingProvince = null;

            if (address != null)
            {
                shippingRecipientName = !string.IsNullOrWhiteSpace(address.RecipientName)
                    ? address.RecipientName
                    : user.Name;

                shippingPhoneNumber = !string.IsNullOrWhiteSpace(address.PhoneNumber)
                    ? address.PhoneNumber
                    : (user.PhoneNumber ?? string.Empty);

                shippingLine1 = address.Line1;
                shippingWard = address.Ward;
                shippingDistrict = address.District;
                shippingProvince = address.Province;
            }
            else
            {
                shippingRecipientName = user.Name;
                shippingPhoneNumber = user.PhoneNumber ?? string.Empty;
                shippingLine1 = user.Address!;
            }

            var productIds = request.Items
                .Select(i => i.ProductId)
                .Distinct()
                .ToList();

            if (productIds.Count == 0)
                throw new InvalidOperationException("Đơn hàng phải có ít nhất 1 sản phẩm hợp lệ");

            var details = await _db.ProductDetails
                .Where(d => productIds.Contains(d.ProductID))
                .GroupBy(d => d.ProductID)
                .Select(g => g.OrderByDescending(d => d.Id).First())
                .ToListAsync();

            if (details.Count != productIds.Count)
                throw new InvalidOperationException("Một số sản phẩm không tồn tại hoặc chưa có thông tin chi tiết");

            var detailDict = details.ToDictionary(d => d.ProductID, d => d);

            var products = await _db.Products
                .Where(p => productIds.Contains(p.ProductID))
                .ToListAsync();

            var productDict = products.ToDictionary(p => p.ProductID, p => p.ProductName);

            decimal subtotal = 0m;
            var orderItems = new List<OrderItem>();

            foreach (var i in request.Items)
            {
                if (!detailDict.TryGetValue(i.ProductId, out var detail))
                    throw new InvalidOperationException($"Không tìm thấy sản phẩm {i.ProductId}");

                var unitPrice = detail.Price;
                var lineTotal = unitPrice * i.Quantity;
                subtotal += lineTotal;

                orderItems.Add(new OrderItem
                {
                    ProductId = i.ProductId,
                    Quantity = i.Quantity,
                    UnitPrice = unitPrice
                });
            }

            decimal discountAmount = 0m;
            string? appliedCouponCode = null;
            CouponApplyResultDTOs? couponResult = null;

            var shippingFee = request.ShippingFee;
            if (shippingFee < 0) shippingFee = 0;

            if (!string.IsNullOrWhiteSpace(request.CouponCode))
            {
                couponResult = await _couponService.ValidateForOrderAsync(
                    request.CouponCode,
                    subtotal,
                    user.UserID);

                if (!couponResult.IsValid)
                    throw new InvalidOperationException(couponResult.Message);

                discountAmount = couponResult.DiscountAmount;
                appliedCouponCode = couponResult.Code;
            }

            var vatBase = Math.Max(subtotal - discountAmount, 0);
            var vatAmount = Math.Round(vatBase * _vatPercent, 0, MidpointRounding.AwayFromZero);
            var finalTotal = vatBase + vatAmount + shippingFee;

            var rawPaymentMethod = (request.PaymentMethod ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(rawPaymentMethod))
                throw new InvalidOperationException("Vui lòng chọn phương thức thanh toán");

            var normalizedPaymentMethod = rawPaymentMethod.ToUpperInvariant();
            string paymentStatus;
            DateTime? paidAt = null;
            string? transactionCode = null;

            switch (normalizedPaymentMethod)
            {
                case "COD":
                    paymentStatus = "PENDING";
                    break;

                case "BANK_TRANSFER_QR":
                case "BANK_TRANSFER":
                case "QR":
                    if (!string.IsNullOrWhiteSpace(request.PaymentTransactionCode))
                    {
                        paymentStatus = "PAID";
                        paidAt = DateTime.UtcNow;
                        transactionCode = request.PaymentTransactionCode;
                    }
                    else
                    {
                        paymentStatus = "PENDING";
                    }
                    break;

                default:
                    paymentStatus = "PENDING";
                    break;
            }

            await using var tx = await _db.Database.BeginTransactionAsync();

            try
            {
                var order = new Order
                {
                    UserId = user.UserID,

                    Subtotal = subtotal,
                    DiscountAmount = discountAmount,
                    CouponCode = appliedCouponCode,

                    ShippingFee = shippingFee,
                    ShippingMethod = request.ShippingMethod,
                    VatAmount = vatAmount,
                    Total = finalTotal,

                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow,
                    Items = orderItems,

                    PaymentMethod = normalizedPaymentMethod,
                    PaymentStatus = paymentStatus,
                    PaymentTransactionCode = transactionCode,
                    PaidAt = paidAt,

                    ShippingRecipientName = shippingRecipientName,
                    ShippingPhoneNumber = shippingPhoneNumber,
                    ShippingLine1 = shippingLine1,
                    ShippingWard = shippingWard,
                    ShippingDistrict = shippingDistrict,
                    ShippingProvince = shippingProvince,

                    CustomerMessage = request.Note,

                };

                _db.Orders.Add(order);
                await _db.SaveChangesAsync();

                if (couponResult != null && couponResult.IsValid)
                {
                    var couponEntity = await _db.Coupons
                        .FirstOrDefaultAsync(c => c.Id == couponResult.CouponId);

                    if (couponEntity != null)
                    {
                        couponEntity.TotalRedeemed++;
                        await _db.SaveChangesAsync();
                    }
                }

                var salesOrderNo = $"ORD-{order.OrderId}";

                var dispatchDto = new RetailDispatchCreateDto
                {
                    CustomerId = user.UserID,
                    CustomerName = shippingRecipientName,
                    DispatchDate = DateTime.UtcNow,
                    SalesOrderNo = salesOrderNo,
                    Note = request.Note,
                    Items = order.Items.Select(oi => new DispatchItemDto
                    {
                        ProductId = oi.ProductId,
                        Quantity = oi.Quantity,
                        UnitPrice = oi.UnitPrice,
                        ProductName = productDict.TryGetValue(oi.ProductId, out var name)
                            ? name
                            : string.Empty,
                        Uom = detailDict.TryGetValue(oi.ProductId, out var d2)
                            ? (d2.Unit ?? "pcs")
                            : "pcs"
                    }).ToList()
                };

                await _dispatchService.CreateSalesDispatchAsync(dispatchDto);

                var dispatchSlipId = await _db.Dispatches
                    .Where(d => d.ReferenceNo == salesOrderNo)
                    .OrderByDescending(d => d.Id)
                    .Select(d => d.Id)
                    .FirstOrDefaultAsync();

                await tx.CommitAsync();

                if (dispatchSlipId > 0)
                {
                    await _notificationService.CreateNewOrderNotificationToWarehouseAsync(order.OrderId, dispatchSlipId);
                }

                return new OrderCreateResultDto
                {
                    OrderId = order.OrderId,
                    Subtotal = order.Subtotal,
                    ShippingFee = order.ShippingFee,
                    DiscountAmount = order.DiscountAmount,
                    VatAmount = order.VatAmount,
                    Total = order.Total,
                    Status = order.Status,
                    CreatedAt = order.CreatedAt
                };
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError(ex, "Lỗi tạo đơn hàng trong OrdersService");
                throw;
            }
        }

        private async Task<Address?> ResolveShippingAddressAsync(CreateOrderRequest request, User user)
        {
            Address? address = null;

            if (request.AddressId.HasValue)
            {
                address = await _db.Addresses
                    .AsNoTracking()
                    .FirstOrDefaultAsync(a =>
                        a.AddressId == request.AddressId.Value &&
                        a.UserId == user.UserID);

                if (address == null)
                    throw new InvalidOperationException("Không tìm thấy địa chỉ giao hàng tương ứng.");
            }
            else
            {
                address = await _db.Addresses
                    .AsNoTracking()
                    .Where(a => a.UserId == user.UserID)
                    .OrderByDescending(a => a.IsDefault)
                    .ThenByDescending(a => a.CreateAt)
                    .FirstOrDefaultAsync();
            }

            return address;
        }

        public async Task<(int total, List<MyOrderListItemDto> items)> GetMyOrdersAsync(
            int userId,
            int page,
            int pageSize)
        {
            var query = _db.Orders
                .AsNoTracking()
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.CreatedAt);

            var total = await query.CountAsync();

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new MyOrderListItemDto
                {
                    OrderId = o.OrderId,
                    Subtotal = o.Subtotal,
                    DiscountAmount = o.DiscountAmount,
                    ShippingFee = o.ShippingFee,
                    VatAmount = o.VatAmount,
                    Total = o.Total,
                    CouponCode = o.CouponCode,
                    Status = o.Status,
                    CreatedAt = o.CreatedAt,
                    PaymentStatus = o.PaymentStatus,
                    PaymentMethod = o.PaymentMethod,
                    ShippingRecipientName = o.ShippingRecipientName
                })
                .ToListAsync();

            return (total, items);
        }
    }
}
