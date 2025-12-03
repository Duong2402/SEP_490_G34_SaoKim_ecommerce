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
using Microsoft.EntityFrameworkCore;

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
            // Email thường nằm ở ClaimTypes.Email hoặc Name
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

                decimal totalFromDb = 0m;
                var orderItems = new System.Collections.Generic.List<OrderItem>();

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

                var paymentMethod = (request.PaymentMethod ?? "").Trim().ToUpperInvariant();

                var orderStatus = "Paid";

                var order = new Order
                {
                    UserId = user.UserID,
                    Total = totalFromDb,
                    Status = orderStatus,
                    CreatedAt = DateTime.UtcNow,
                    Items = orderItems
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                var dispatchDto = new RetailDispatchCreateDto
                {
                    CustomerId = user.UserID,
                    CustomerName = user.Name,
                    DispatchDate = DateTime.UtcNow,
                    SalesOrderNo = $"ORD-{order.OrderId}",  
                    Note = request.Note,
                    Items = order.Items.Select(oi => new DispatchItemDto
                    {
                        ProductId = oi.ProductId,
                        Quantity = oi.Quantity
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

        [HttpGet("my")]
        public async Task<IActionResult> GetMyOrders(int page = 1, int pageSize = 10)
        {
            try
            {
                if (page <= 0) page = 1;
                if (pageSize <= 0) pageSize = 10;

                var user = await GetCurrentUserAsync();
                if (user == null)
                    return Unauthorized("Không xác định được người dùng từ token");

                var query = _context.Orders
                    .AsNoTracking()
                    .Include(o => o.Items)
                        .ThenInclude(i => i.Product)   // để lấy tên sản phẩm
                    .Where(o => o.UserId == user.UserID)
                    .OrderByDescending(o => o.CreatedAt);

                var total = await query.CountAsync();

                var orders = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(o => new
                    {
                        orderId = o.OrderId,
                        createdAt = o.CreatedAt,
                        total = o.Total,
                        status = o.Status,
                        items = o.Items.Select(i => new
                        {
                            orderItemId = i.OrderItemId,
                            productId = i.ProductId,
                            productName = i.Product.ProductName, // hoặc i.Product.Name tùy entity

                            // Lấy ảnh mới nhất từ ProductDetails theo ProductId
                            productImage = _context.ProductDetails
                                .Where(d => d.ProductID == i.ProductId)
                                .OrderByDescending(d => d.Id)
                                .Select(d => d.Image)
                                .FirstOrDefault(),

                            quantity = i.Quantity,
                            unitPrice = i.UnitPrice
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