using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Xunit;

using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Tests.Services
{
    public class CustomerOrderServiceTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new SaoKimDBContext(options);
        }

        private CustomerOrderService CreateService(SaoKimDBContext db)
            => new CustomerOrderService(db);

        private async Task<(Order order, Product product)> SeedBasicOrderAsync(
            SaoKimDBContext db,
            int orderId = 1,
            int userId = 1,
            string orderStatus = "NEW",
            string paymentStatus = "",
            bool withInvoice = false,
            InvoiceStatus invoiceStatus = InvoiceStatus.Pending)
        {
            var product = new Product
            {
                ProductID = 100,
                ProductName = "Sample Product",
                ProductCode = "P100"
            };

            var order = new Order
            {
                OrderId = orderId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                Status = orderStatus,
                Total = 200m,
                ShippingRecipientName = "Nguyen Van A",
                ShippingPhoneNumber = "0123456789",
                ShippingLine1 = "123 ABC",
                ShippingWard = "Ward 1",
                ShippingDistrict = "District 1",
                ShippingProvince = "HCM",
                PaymentMethod = "COD",
                PaymentStatus = paymentStatus,
                PaidAt = null,
                PaymentTransactionCode = "TXN123",
                Items = new List<OrderItem>()
            };

            var item = new OrderItem
            {
                OrderItemId = 1,
                Order = order,
                ProductId = product.ProductID,
                Product = product,
                Quantity = 2,
                UnitPrice = 100m
            };

            order.Items.Add(item);

            if (withInvoice)
            {
                var invoice = new Invoice
                {
                    Id = 10,
                    Code = "INV001",
                    Order = order,
                    OrderId = order.OrderId,
                    Subtotal = 200m,
                    Discount = 0m,
                    Tax = 20m,
                    Total = 220m,
                    Status = invoiceStatus
                };
                order.Invoice = invoice;
                db.Invoices.Add(invoice);
            }

            db.Products.Add(product);
            db.Orders.Add(order);
            await db.SaveChangesAsync();

            return (order, product);
        }

        [Fact]
        public async Task GetOrderDetailAsync_ReturnsNull_WhenOrderNotFound()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var result = await service.GetOrderDetailAsync(999, 1);

            Assert.Null(result);
        }

        [Fact]
        public async Task GetOrderDetailAsync_ReturnsNull_WhenOrderBelongsToAnotherUser()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            await SeedBasicOrderAsync(db, orderId: 1, userId: 2);

            var result = await service.GetOrderDetailAsync(1, 1);

            Assert.Null(result);
        }

        [Fact]
        public async Task GetOrderDetailAsync_MapsBasicOrderFields()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, product) = await SeedBasicOrderAsync(db, orderId: 5, userId: 1, orderStatus: "PENDING");

            var dto = await service.GetOrderDetailAsync(5, 1);

            Assert.NotNull(dto);
            Assert.Equal(order.OrderId, dto!.OrderId);
            Assert.Equal(order.CreatedAt, dto.CreatedAt);
            Assert.Equal(order.Status, dto.Status);
            Assert.Equal(order.Total, dto.Total);
        }

        [Fact]
        public async Task GetOrderDetailAsync_MapsShippingAddress()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, _) = await SeedBasicOrderAsync(db);

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            Assert.NotNull(dto);
            Assert.Equal(order.ShippingRecipientName, dto!.ShippingAddress.RecipientName);
            Assert.Equal(order.ShippingPhoneNumber, dto.ShippingAddress.PhoneNumber);
            Assert.Equal(order.ShippingLine1, dto.ShippingAddress.Line1);
            Assert.Equal(order.ShippingWard, dto.ShippingAddress.Ward);
            Assert.Equal(order.ShippingDistrict, dto.ShippingAddress.District);
            Assert.Equal(order.ShippingProvince, dto.ShippingAddress.Province);
        }

        [Fact]
        public async Task GetOrderDetailAsync_MapsOrderItemsCorrectly()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, product) = await SeedBasicOrderAsync(db);

            db.ProductDetails.Add(new ProductDetail
            {
                Id = 1,
                ProductID = product.ProductID,
                Image = "image1.jpg",
                Unit = "cái"
            });
            await db.SaveChangesAsync();

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            Assert.NotNull(dto);
            var itemDto = Assert.Single(dto!.Items);
            Assert.Equal(product.ProductID, itemDto.ProductId);
            Assert.Equal(product.ProductName, itemDto.ProductName);
            Assert.Equal(product.ProductCode, itemDto.ProductCode);
            Assert.Equal(2, itemDto.Quantity);
            Assert.Equal(100m, itemDto.UnitPrice);
            Assert.Equal(200m, itemDto.LineTotal);
        }

        [Fact]
        public async Task GetOrderDetailAsync_UsesLatestProductDetailById()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, product) = await SeedBasicOrderAsync(db);

            db.ProductDetails.AddRange(
                new ProductDetail
                {
                    Id = 1,
                    ProductID = product.ProductID,
                    Image = "old.jpg",
                    Unit = "cũ"
                },
                new ProductDetail
                {
                    Id = 2,
                    ProductID = product.ProductID,
                    Image = "new.jpg",
                    Unit = "mới"
                }
            );
            await db.SaveChangesAsync();

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            var itemDto = Assert.Single(dto!.Items);
            Assert.Equal("new.jpg", itemDto.ImageUrl);
            Assert.Equal("mới", itemDto.Unit);
        }

        [Fact]
        public async Task GetOrderDetailAsync_SetsImageAndUnitNull_WhenNoProductDetail()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, _) = await SeedBasicOrderAsync(db);

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            var itemDto = Assert.Single(dto!.Items);
            Assert.Null(itemDto.ImageUrl);
            Assert.Null(itemDto.Unit);
        }

        [Fact]
        public async Task GetOrderDetailAsync_SetsPaymentStatusPaid_WhenInvoiceIsPaid()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, _) = await SeedBasicOrderAsync(
                db,
                withInvoice: true,
                invoiceStatus: InvoiceStatus.Paid,
                paymentStatus: "");

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            Assert.Equal("PAID", dto!.Payment.Status);
        }

        [Fact]
        public async Task GetOrderDetailAsync_SetsPaymentStatusPaid_WhenOrderStatusLooksPaid()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, _) = await SeedBasicOrderAsync(
                db,
                orderStatus: "   Completed   ",
                paymentStatus: "");

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            Assert.Equal("PAID", dto!.Payment.Status);
        }

        [Fact]
        public async Task GetOrderDetailAsync_SetsPaymentStatusPaid_WhenPaymentFieldLooksPaid()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, _) = await SeedBasicOrderAsync(
                db,
                orderStatus: "PENDING",
                paymentStatus: "đã thanh toán");

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            Assert.Equal("PAID", dto!.Payment.Status);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public async Task GetOrderDetailAsync_SetsPaymentStatusPending_WhenBlankAndNotPaid(string paymentStatus)
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, _) = await SeedBasicOrderAsync(
                db,
                orderStatus: "NEW",
                paymentStatus: paymentStatus ?? "");

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            Assert.Equal("PENDING", dto!.Payment.Status);
        }

        [Fact]
        public async Task GetOrderDetailAsync_TrimsPaymentStatus_WhenNotPaid()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, _) = await SeedBasicOrderAsync(
                db,
                orderStatus: "NEW",
                paymentStatus: "   WAITING   ");

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            Assert.Equal("WAITING", dto!.Payment.Status);
        }

        [Fact]
        public async Task GetOrderDetailAsync_RecognizesVietnamesePaidWordsInStatus()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, _) = await SeedBasicOrderAsync(
                db,
                orderStatus: "Đã HOÀN tất",
                paymentStatus: "");

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            Assert.Equal("PAID", dto!.Payment.Status);
        }

        [Fact]
        public async Task GetOrderDetailAsync_RecognizesVietnameseNoAccentPaidInPaymentField()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, _) = await SeedBasicOrderAsync(
                db,
                orderStatus: "PENDING",
                paymentStatus: "da thanh toan roi");

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            Assert.Equal("PAID", dto!.Payment.Status);
        }

        [Fact]
        public async Task GetOrderDetailAsync_MapsPaymentFields()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, _) = await SeedBasicOrderAsync(
                db,
                orderStatus: "PENDING",
                paymentStatus: "WAITING");

            order.PaymentMethod = "MOMO";
            order.PaidAt = DateTime.UtcNow.AddMinutes(-5);
            order.PaymentTransactionCode = "TRX999";
            db.Orders.Update(order);
            await db.SaveChangesAsync();

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            Assert.Equal("MOMO", dto!.Payment.Method);
            Assert.Equal(order.PaidAt, dto.Payment.PaidAt);
            Assert.Equal("TRX999", dto.Payment.TransactionCode);
        }

        [Fact]
        public async Task GetOrderDetailAsync_MapsInvoice_WhenExists()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, _) = await SeedBasicOrderAsync(
                db,
                withInvoice: true,
                invoiceStatus: InvoiceStatus.Paid,
                paymentStatus: "");

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            Assert.NotNull(dto!.Invoice);
            Assert.Equal(order.Invoice!.Id, dto.Invoice!.InvoiceId);
            Assert.Equal(order.Invoice.Code, dto.Invoice.Code);
            Assert.Equal(order.Invoice.Subtotal, dto.Invoice.Subtotal);
            Assert.Equal(order.Invoice.Discount, dto.Invoice.Discount);
            Assert.Equal(order.Invoice.Tax, dto.Invoice.Tax);
            Assert.Equal(order.Invoice.Total, dto.Invoice.Total);
        }

        [Fact]
        public async Task GetOrderDetailAsync_InvoiceNull_WhenNoInvoice()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, _) = await SeedBasicOrderAsync(
                db,
                withInvoice: false,
                paymentStatus: "");

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            Assert.Null(dto!.Invoice);
        }

        [Fact]
        public async Task GetOrderDetailAsync_HandlesOrderWithoutItems()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var order = new Order
            {
                OrderId = 50,
                UserId = 1,
                CreatedAt = DateTime.UtcNow,
                Status = "NEW",
                Total = 0m,
                Items = new List<OrderItem>()
            };

            db.Orders.Add(order);
            await db.SaveChangesAsync();

            var dto = await service.GetOrderDetailAsync(50, 1);

            Assert.NotNull(dto);
            Assert.Empty(dto!.Items);
        }

        [Fact]
        public async Task GetOrderDetailAsync_HandlesMultipleItemsAndDetails()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var product1 = new Product { ProductID = 1, ProductName = "P1", ProductCode = "C1" };
            var product2 = new Product { ProductID = 2, ProductName = "P2", ProductCode = "C2" };

            var order = new Order
            {
                OrderId = 60,
                UserId = 1,
                CreatedAt = DateTime.UtcNow,
                Status = "NEW",
                Total = 300m,
                Items = new List<OrderItem>()
            };

            var item1 = new OrderItem
            {
                OrderItemId = 1,
                Order = order,
                Product = product1,
                ProductId = product1.ProductID,
                Quantity = 1,
                UnitPrice = 100m
            };

            var item2 = new OrderItem
            {
                OrderItemId = 2,
                Order = order,
                Product = product2,
                ProductId = product2.ProductID,
                Quantity = 2,
                UnitPrice = 100m
            };

            order.Items.Add(item1);
            order.Items.Add(item2);

            db.Products.AddRange(product1, product2);
            db.Orders.Add(order);

            db.ProductDetails.Add(new ProductDetail
            {
                Id = 1,
                ProductID = product1.ProductID,
                Image = "p1.jpg",
                Unit = "chai"
            });
            db.ProductDetails.Add(new ProductDetail
            {
                Id = 2,
                ProductID = product2.ProductID,
                Image = "p2.jpg",
                Unit = "hộp"
            });

            await db.SaveChangesAsync();

            var dto = await service.GetOrderDetailAsync(60, 1);

            Assert.Equal(2, dto!.Items.Count);
            var itemDto1 = dto.Items.Single(x => x.ProductId == product1.ProductID);
            var itemDto2 = dto.Items.Single(x => x.ProductId == product2.ProductID);

            Assert.Equal("p1.jpg", itemDto1.ImageUrl);
            Assert.Equal("chai", itemDto1.Unit);
            Assert.Equal("p2.jpg", itemDto2.ImageUrl);
            Assert.Equal("hộp", itemDto2.Unit);
        }

        [Fact]
        public async Task GetOrderDetailAsync_HandlesNullPaymentStatus()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var (order, _) = await SeedBasicOrderAsync(
                db,
                orderId: 1,
                userId: 1,
                orderStatus: "NEW",
                paymentStatus: "");

            order.PaymentStatus = null;
            db.Orders.Update(order);
            await db.SaveChangesAsync();

            var dto = await service.GetOrderDetailAsync(order.OrderId, order.UserId);

            Assert.NotNull(dto);
            Assert.Equal("NEW", dto!.Status);
            Assert.Equal("PENDING", dto.Payment.Status);
        }

    }
}
