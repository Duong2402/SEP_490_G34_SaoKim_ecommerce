using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;          
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
        {
            return new CustomerOrderService(db);
        }

        [Fact]
        public async Task GetOrderDetailAsync_Returns_Null_When_Order_Not_Found()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var result = await service.GetOrderDetailAsync(orderId: 1, currentUserId: 1);

            Assert.Null(result);
        }

        [Fact]
        public async Task GetOrderDetailAsync_Returns_Null_When_Order_Not_Belong_To_User()
        {
            using var db = CreateDbContext();

            db.Orders.Add(new Order
            {
                OrderId = 10,
                UserId = 999,
                Status = "Pending",
                Total = 100
            });
            await db.SaveChangesAsync();

            var service = CreateService(db);

            var result = await service.GetOrderDetailAsync(orderId: 10, currentUserId: 1);

            Assert.Null(result);
        }

        [Fact]
        public async Task GetOrderDetailAsync_Maps_Items_Shipping_And_Invoice()
        {
            using var db = CreateDbContext();

            var product = new Product
            {
                ProductName = "Test Product",
                ProductCode = "P001",
                ProductDetails = new List<ProductDetail>
                {
                    new ProductDetail
                    {
                        Id = 1,
                        ProductID = 1,
                        Image = "/images/p1.jpg",
                        Unit = "pcs",
                        Price = 100,
                        Quantity = 10,
                        Status = "Active",
                        CreateAt = DateTime.UtcNow.AddDays(-1)
                    }
                }
            };
            db.Products.Add(product);
            await db.SaveChangesAsync();

            var order = new Order
            {
                OrderId = 5,
                UserId = 1,
                CreatedAt = DateTime.UtcNow,
                Status = "Pending",
                Total = 200,
                ShippingRecipientName = "A",
                ShippingPhoneNumber = "0123",
                ShippingLine1 = "Line1",
                ShippingWard = "Ward",
                ShippingDistrict = "District",
                ShippingProvince = "Province",
                Items = new List<OrderItem>
                {
                    new OrderItem
                    {
                        ProductId = product.ProductID,
                        Quantity = 2,
                        UnitPrice = 100
                    }
                },
                Invoice = new Invoice
                {
                    Code = "INV001",
                    Subtotal = 200,
                    Discount = 0,
                    Tax = 0,
                    Total = 200,
                    Status = InvoiceStatus.Paid
                }
            };

            db.Orders.Add(order);
            await db.SaveChangesAsync();

            var service = CreateService(db);

            var result = await service.GetOrderDetailAsync(order.OrderId, 1);

            Assert.NotNull(result);
            Assert.Equal(order.OrderId, result!.OrderId);
            Assert.Equal(order.Total, result.Total);
            Assert.NotNull(result.Items);
            Assert.Single(result.Items);

            var item = result.Items.First();
            Assert.Equal(product.ProductID, item.ProductId);
            Assert.Equal("Test Product", item.ProductName);
            Assert.Equal("P001", item.ProductCode);
            Assert.Equal("/images/p1.jpg", item.ImageUrl);
            Assert.Equal("pcs", item.Unit);
            Assert.Equal(2, item.Quantity);
            Assert.Equal(100, item.UnitPrice);
            Assert.Equal(200, item.LineTotal);

            Assert.NotNull(result.ShippingAddress);
            Assert.Equal("A", result.ShippingAddress!.RecipientName);
            Assert.Equal("0123", result.ShippingAddress.PhoneNumber);
            Assert.Equal("Line1", result.ShippingAddress.Line1);

            Assert.NotNull(result.Invoice);
            Assert.Equal("INV001", result.Invoice!.Code);
            Assert.Equal(200, result.Invoice.Total);
        }

        [Fact]
        public async Task GetOrderDetailAsync_Normalizes_PaymentStatus_To_PAID_When_Invoice_Paid()
        {
            using var db = CreateDbContext();

            db.Products.Add(new Product
            {
                ProductName = "P",
                ProductCode = "C1",
                ProductDetails = new List<ProductDetail>
                {
                    new ProductDetail
                    {
                        Price = 10,
                        Quantity = 1,
                        Status = "Active",
                        CreateAt = DateTime.UtcNow
                    }
                }
            });
            await db.SaveChangesAsync();

            var product = await db.Products.FirstAsync();

            var order = new Order
            {
                OrderId = 20,
                UserId = 1,
                Status = "Something",
                Total = 10,
                Items = new List<OrderItem>
                {
                    new OrderItem
                    {
                        ProductId = product.ProductID,
                        Quantity = 1,
                        UnitPrice = 10
                    }
                },
                Invoice = new Invoice
                {
                    Code = "INV-00020",
                    Subtotal = 10,
                    Discount = 0,
                    Tax = 0,
                    Total = 10,
                    Status = InvoiceStatus.Paid
                }
            };

            db.Orders.Add(order);
            await db.SaveChangesAsync();

            var service = CreateService(db);

            var result = await service.GetOrderDetailAsync(order.OrderId, 1);

            Assert.NotNull(result);
            Assert.NotNull(result!.Payment);
            Assert.Equal("PAID", result.Payment!.Status);
        }

        [Fact]
        public async Task GetOrderDetailAsync_Sets_PaymentStatus_Pending_When_Empty()
        {
            using var db = CreateDbContext();

            db.Products.Add(new Product
            {
                ProductName = "P",
                ProductCode = "C1",
                ProductDetails = new List<ProductDetail>
                {
                    new ProductDetail
                    {
                        Price = 10,
                        Quantity = 1,
                        Status = "Active",
                        CreateAt = DateTime.UtcNow
                    }
                }
            });
            await db.SaveChangesAsync();

            var product = await db.Products.FirstAsync();

            var order = new Order
            {
                OrderId = 30,
                UserId = 1,
                Status = "Pending",
                PaymentStatus = null,
                Total = 10,
                Items = new List<OrderItem>
                {
                    new OrderItem
                    {
                        ProductId = product.ProductID,
                        Quantity = 1,
                        UnitPrice = 10
                    }
                }
            };

            db.Orders.Add(order);
            await db.SaveChangesAsync();

            var service = CreateService(db);

            var result = await service.GetOrderDetailAsync(order.OrderId, 1);

            Assert.NotNull(result);
            Assert.NotNull(result!.Payment);
            Assert.Equal("PENDING", result.Payment!.Status);
        }

        [Fact]
        public async Task GetOrderDetailAsync_Uses_Status_Text_To_Detect_PAID()
        {
            using var db = CreateDbContext();

            db.Products.Add(new Product
            {
                ProductName = "P",
                ProductCode = "C1",
                ProductDetails = new List<ProductDetail>
                {
                    new ProductDetail
                    {
                        Price = 10,
                        Quantity = 1,
                        Status = "Active",
                        CreateAt = DateTime.UtcNow
                    }
                }
            });
            await db.SaveChangesAsync();

            var product = await db.Products.FirstAsync();

            var order = new Order
            {
                OrderId = 40,
                UserId = 1,
                Status = "Đã thanh toán",
                PaymentStatus = "something",
                Total = 10,
                Items = new List<OrderItem>
                {
                    new OrderItem
                    {
                        ProductId = product.ProductID,
                        Quantity = 1,
                        UnitPrice = 10
                    }
                }
            };

            db.Orders.Add(order);
            await db.SaveChangesAsync();

            var service = CreateService(db);

            var result = await service.GetOrderDetailAsync(order.OrderId, 1);

            Assert.NotNull(result);
            Assert.NotNull(result!.Payment);
            Assert.Equal("PAID", result.Payment!.Status);
        }
    }
}
