using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models.Requests;
using SaoKim_ecommerce_BE.Services;

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

        public OrdersController(
            SaoKimDBContext context,
            ILogger<OrdersController> logger,
            IDispatchService dispatchService)
        {
            _context = context;
            _logger = logger;
            _dispatchService = dispatchService;
        }

        // Lấy user hiện tại từ email trong token
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

        // POST /api/orders  : tạo đơn cho user hiện tại
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

                // ================= LẤY ADDRESS SNAPSHOT =================

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
                    // Không truyền AddressId -> ưu tiên địa chỉ mặc định, nếu không có thì lấy địa chỉ tạo gần nhất
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
                    // Fallback: dùng address trong bảng users
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

                // ================= LẤY GIÁ SẢN PHẨM TỪ DB =================

                var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
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
                var productDict = await _context.Products
                    .Where(p => productIds.Contains(p.ProductID))
                    .ToDictionaryAsync(p => p.ProductID, p => p.ProductName);

                decimal totalFromDb = 0m;
                var orderItems = new List<OrderItem>();

                foreach (var i in request.Items)
                {
                    if (!detailDict.TryGetValue(i.ProductId, out var detail))
                        return BadRequest(new { message = $"Product {i.ProductId} not found" });

                    var unitPrice = detail.Price;
                    var lineTotal = unitPrice * i.Quantity;
                    totalFromDb += lineTotal;

                    orderItems.Add(new OrderItem
                    {
                        ProductId = i.ProductId,
                        Quantity = i.Quantity,
                        UnitPrice = unitPrice
                    });
                }

                // ================= XỬ LÝ PAYMENT =================

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
                    case "QR":
                    case "BANK_TRANSFER":
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

                // ================= TẠO ORDER =================

                var order = new Order
                {
                    UserId = user.UserID,
                    Total = totalFromDb,
                    Status = "Pending", // giữ flow kho -> staff như cũ
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

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                // ================= TẠO PHIẾU XUẤT BÁN LẺ (DISPATCH) =================

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
                            ? d2.Unit ?? "pcs"
                            : "pcs"
                    }).ToList()
                };

                await _dispatchService.CreateSalesDispatchAsync(dispatchDto);

                return Ok(new
                {
                    order.OrderId,
                    order.Total,
                    order.Status,
                    order.CreatedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi tạo order");
                return StatusCode(500, new { message = "Lỗi server khi tạo đơn hàng", detail = ex.Message });
            }
        }

        // GET /api/orders/my
        [HttpGet("my")]
        public async Task<IActionResult> GetMyOrders(int page = 1, int pageSize = 10)
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
                    .Include(o => o.Items)
                        .ThenInclude(i => i.Product)
                    .Where(o => o.UserId == user.UserID)
                    .OrderByDescending(o => o.CreatedAt);

                var total = await query.CountAsync();

                var orders = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(o => new
                    {
                        o.OrderId,
                        o.Total,
                        o.Status,
                        o.CreatedAt,
                        items = o.Items.Select(i => new
                        {
                            i.OrderItemId,
                            i.ProductId,
                            productName = i.Product != null ? i.Product.ProductName : null,
                            productCode = i.Product != null ? i.Product.ProductCode : null,
                            i.Quantity,
                            i.UnitPrice,
                            lineTotal = i.UnitPrice * i.Quantity
                        }).ToList()
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
