using DocumentFormat.OpenXml.VariantTypes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models.Requests;
using SaoKim_ecommerce_BE.Services;
using System.Security.Claims;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly SaoKimDBContext _context;
        private readonly ILogger<OrdersController> _logger;
        private readonly IDispatchService _dispatchService;
        private readonly ICouponService _couponService;
        private readonly decimal VatPercent;
        public OrdersController(
            SaoKimDBContext context,
            ILogger<OrdersController> logger,
            IDispatchService dispatchService,
            ICouponService couponService,
            IConfiguration config)
        {
            _context = context;
            _logger = logger;
            _dispatchService = dispatchService;
            _couponService = couponService;
            VatPercent = config.GetValue<decimal>("VAT:Value") / 100;
        }

        private async Task<User?> GetCurrentUserAsync()
        {
            var email =
                User.FindFirstValue(ClaimTypes.Email) ??
                User.Identity?.Name;

            if (string.IsNullOrEmpty(email))
                return null;

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == email);

            return user;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateOrderRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                if (request.Items == null || request.Items.Count == 0)
                    return BadRequest(new { message = "Order must have at least 1 item" });

                var user = await GetCurrentUserAsync();
                if (user == null)
                    return Unauthorized("Không tìm thấy user tương ứng với token");

                Address? address = null;

                if (request.AddressId.HasValue)
                {
                    address = await _context.Addresses
                        .AsNoTracking()
                        .FirstOrDefaultAsync(a =>
                            a.AddressId == request.AddressId.Value &&
                            a.UserId == user.UserID);

                    if (address == null)
                    {
                        return BadRequest(new { message = "Không tìm thấy địa chỉ giao hàng tương ứng." });
                    }
                }
                else
                {
                    address = await _context.Addresses
                        .AsNoTracking()
                        .Where(a => a.UserId == user.UserID)
                        .OrderByDescending(a => a.IsDefault)
                        .ThenByDescending(a => a.CreateAt)
                        .FirstOrDefaultAsync();
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
                    if (string.IsNullOrWhiteSpace(user.Address))
                    {
                        return BadRequest(new
                        {
                            message = "Không tìm thấy địa chỉ giao hàng. Vui lòng thêm địa chỉ giao hàng trước khi đặt hàng."
                        });
                    }

                    shippingRecipientName = user.Name;
                    shippingPhoneNumber = user.PhoneNumber ?? string.Empty;
                    shippingLine1 = user.Address;
                }


                var productIds = request.Items
                    .Select(i => i.ProductId)
                    .Distinct()
                    .ToList();

                if (productIds.Count == 0)
                    return BadRequest(new { message = "Order must have at least 1 valid product" });

                var details = await _context.ProductDetails
                    .Where(d => productIds.Contains(d.ProductID))
                    .GroupBy(d => d.ProductID)
                    .Select(g => g.OrderByDescending(d => d.Id).First())
                    .ToListAsync();

                if (details.Count != productIds.Count)
                    return BadRequest(new { message = "Some products not found or have no details" });

                var detailDict = details.ToDictionary(d => d.ProductID, d => d);

                var products = await _context.Products
                    .Where(p => productIds.Contains(p.ProductID))
                    .ToListAsync();

                var productDict = products.ToDictionary(p => p.ProductID, p => p.ProductName);

                decimal subtotal = 0m;
                var orderItems = new List<OrderItem>();

                foreach (var i in request.Items)
                {
                    if (!detailDict.TryGetValue(i.ProductId, out var detail))
                        return BadRequest(new { message = $"Product {i.ProductId} not found" });

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
                CouponApplyResultDto? couponResult = null;

                var shippingFee = request.ShippingFee;
                if (shippingFee < 0) shippingFee = 0;

                if (!string.IsNullOrWhiteSpace(request.CouponCode))
                {
                    couponResult = await _couponService.ValidateForOrderAsync(
                        request.CouponCode,
                        subtotal,
                        user.UserID);

                    if (!couponResult.IsValid)
                    {
                        return BadRequest(new { message = couponResult.Message });
                    }

                    discountAmount = couponResult.DiscountAmount;
                    appliedCouponCode = couponResult.Code;
                }

                var vatBase = Math.Max(subtotal - discountAmount, 0);

                var vatAmount = Math.Round(vatBase * VatPercent, 0, MidpointRounding.AwayFromZero);

                var finalTotal = vatBase + vatAmount + shippingFee;

                var rawPaymentMethod = (request.PaymentMethod ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(rawPaymentMethod))
                    return BadRequest(new { message = "PaymentMethod is required" });

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
                    ShippingProvince = shippingProvince
                };


                await using var tx = await _context.Database.BeginTransactionAsync();

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                if (couponResult != null && couponResult.IsValid)
                {
                    var couponEntity = await _context.Coupons
                        .FirstOrDefaultAsync(c => c.Id == couponResult.CouponId);

                    if (couponEntity != null)
                    {
                        couponEntity.TotalRedeemed++;
                        await _context.SaveChangesAsync();
                    }
                }

                var dispatchDto = new RetailDispatchCreateDto
                {
                    CustomerId = user.UserID,
                    CustomerName = shippingRecipientName,
                    DispatchDate = DateTime.UtcNow,
                    SalesOrderNo = $"ORD-{order.OrderId}",
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

                await tx.CommitAsync();

                return Ok(new
                {
                    order.OrderId,
                    order.Subtotal,
                    order.ShippingFee,
                    order.DiscountAmount,
                    order.VatAmount,
                    order.Total,
                    order.Status,
                    order.CreatedAt
                });

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi tạo đơn hàng");
                return StatusCode(500, new { message = "Lỗi server khi tạo đơn hàng", detail = ex.Message });
            }
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                if (page <= 0) page = 1;
                if (pageSize <= 0) pageSize = 10;

                var user = await GetCurrentUserAsync();
                if (user == null)
                    return Unauthorized("Không tìm thấy user tương ứng với token");

                var query = _context.Orders
                    .AsNoTracking()
                    .Where(o => o.UserId == user.UserID)
                    .OrderByDescending(o => o.CreatedAt);

                var total = await query.CountAsync();

                var orders = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(o => new
                    {
                        o.OrderId,
                        o.Subtotal,
                        o.DiscountAmount,
                        o.ShippingFee,
                        o.VatAmount,
                        o.Total,
                        o.CouponCode,
                        o.Status,
                        o.CreatedAt,
                        o.PaymentStatus,
                        o.PaymentMethod,
                        o.ShippingRecipientName
                    })
                    .ToListAsync();

                return Ok(new
                {
                    total,
                    items = orders
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi GetMyOrders");
                return StatusCode(500, new { message = "Lỗi server GetMyOrders", detail = ex.Message });
            }
        }
    }
}
