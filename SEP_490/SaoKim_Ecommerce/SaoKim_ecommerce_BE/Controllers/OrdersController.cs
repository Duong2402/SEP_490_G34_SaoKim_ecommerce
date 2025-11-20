using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly SaoKimDBContext _db;

        public OrdersController(SaoKimDBContext db)
        {
            _db = db;
        }

        // DTO đơn giản cho tạo đơn hàng
        public class CreateOrderItemDto
        {
            public int ProductId { get; set; }
            public decimal Quantity { get; set; }
        }

        public class CreateOrderDto
        {
            public int CustomerId { get; set; }
            public List<CreateOrderItemDto> Items { get; set; } = new();
        }

        public class OrderCreatedDto
        {
            public int OrderId { get; set; }
            public int InvoiceId { get; set; }
            public string InvoiceCode { get; set; } = string.Empty;
            public decimal Total { get; set; }
        }

        // POST /api/orders
        // Body: CreateOrderDto
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateOrderDto model)
        {
            if (model == null || model.Items == null || model.Items.Count == 0)
                return BadRequest("Order phải có ít nhất 1 sản phẩm.");

            // 1. Tìm customer
            var customer = await _db.Users
                .FirstOrDefaultAsync(u =>
                    u.UserID == model.CustomerId &&
                    u.DeletedAt == null);

            if (customer == null)
                return BadRequest("Customer không tồn tại.");

            // 2. Lấy product theo Id
            var productIds = model.Items.Select(i => i.ProductId).Distinct().ToList();

            var products = await _db.Products
                .Where(p => productIds.Contains(p.ProductID))
                .ToListAsync();

            if (products.Count != productIds.Count)
                return BadRequest("Có sản phẩm không tồn tại.");

            // 3. Tính tiền và chuẩn bị InvoiceItem
            decimal subtotal = 0m;
            var invoiceItems = new List<InvoiceItem>();

            foreach (var item in model.Items)
            {
                if (item.Quantity <= 0)
                    return BadRequest("Số lượng phải > 0.");

                var product = products.First(p => p.ProductID == item.ProductId);
                var unitPrice = product.Price;
                var lineTotal = unitPrice * item.Quantity;

                subtotal += lineTotal;

                invoiceItems.Add(new InvoiceItem
                {
                    ProductId = product.ProductID,
                    ProductName = product.ProductName,
                    Uom = string.IsNullOrWhiteSpace(product.Unit) ? "pcs" : product.Unit,
                    Quantity = item.Quantity,
                    UnitPrice = unitPrice,
                    LineTotal = lineTotal
                });
            }

            decimal discount = 0m; // tạm thời chưa dùng
            decimal tax = 0m;      // nếu có VAT thì cộng sau
            decimal total = subtotal - discount + tax;

            using var tx = await _db.Database.BeginTransactionAsync();

            // 4. Tạo Order
            var order = new Order
            {
                UserId = customer.UserID,
                Total = total,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _db.Orders.Add(order);
            await _db.SaveChangesAsync();

            // 5. Tạo Invoice gắn với Order + Customer
            var invoice = new Invoice
            {
                Code = GenerateInvoiceCode(),
                CreatedAt = DateTime.UtcNow,
                CustomerId = customer.UserID,
                CustomerName = customer.Name,
                Email = customer.Email,
                Phone = customer.PhoneNumber,
                OrderId = order.OrderId,
                Subtotal = subtotal,
                Discount = discount,
                Tax = tax,
                Total = total,
                Status = InvoiceStatus.Pending
            };

            _db.Set<Invoice>().Add(invoice);
            await _db.SaveChangesAsync();

            // 6. Thêm InvoiceItems
            foreach (var invItem in invoiceItems)
            {
                invItem.InvoiceId = invoice.Id;
            }

            _db.Set<InvoiceItem>().AddRange(invoiceItems);
            await _db.SaveChangesAsync();

            await tx.CommitAsync();

            var result = new OrderCreatedDto
            {
                OrderId = order.OrderId,
                InvoiceId = invoice.Id,
                InvoiceCode = invoice.Code,
                Total = total
            };

            return Ok(result);
        }

        // Mã hoá đơn đơn giản: INV-YYYYMMDDHHMMSSfff
        private static string GenerateInvoiceCode()
        {
            return $"INV-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
        }
    }
}
