using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services;
using SaoKim_ecommerce_BE.Services.Realtime;

namespace SaoKim_ecommerce_BE.Tests.Services
{
    public class StaffOrdersServiceTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new SaoKimDBContext(options);
        }

        private static StaffOrdersService CreateService(
            SaoKimDBContext db,
            Mock<IDispatchService>? dispatchMock = null,
            Mock<IRealtimePublisher>? rtMock = null,
            Mock<ILogger<StaffOrdersService>>? loggerMock = null)
        {
            dispatchMock ??= new Mock<IDispatchService>(MockBehavior.Strict);
            rtMock ??= new Mock<IRealtimePublisher>(MockBehavior.Strict);
            loggerMock ??= new Mock<ILogger<StaffOrdersService>>(MockBehavior.Loose);

            // default no-op for publish calls (so tests not verifying publish won't fail)
            rtMock.Setup(x => x.PublishAsync(It.IsAny<string>(), It.IsAny<object>())).Returns(Task.CompletedTask);
            rtMock.Setup(x => x.PublishToRoleAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>())).Returns(Task.CompletedTask);
            rtMock.Setup(x => x.PublishToUserAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<object>())).Returns(Task.CompletedTask);
            rtMock.Setup(x => x.PublishToWarehouseAsync(It.IsAny<string>(), It.IsAny<object>())).Returns(Task.CompletedTask);

            // default no-op for dispatch delete
            dispatchMock.Setup(x => x.DeleteDispatchSlipAsync(It.IsAny<int>())).Returns(Task.CompletedTask);

            return new StaffOrdersService(db, loggerMock.Object, dispatchMock.Object, rtMock.Object);
        }

        private static User SeedCustomer(SaoKimDBContext db, int id = 1, string? name = "Cus 1", string? email = "c1@test.com", string? phone = "0900000000")
        {
            var role = new Role { Name = "customer" };
            db.Roles.Add(role);
            db.SaveChanges();

            var u = new User
            {
                UserID = id,
                Name = name,
                Email = email,
                PhoneNumber = phone,
                RoleId = role.RoleId,
                Status = "Active",
                CreateAt = DateTime.UtcNow
            };

            db.Users.Add(u);
            db.SaveChanges();
            return u;
        }

        private static Product SeedProduct(SaoKimDBContext db, int id, string code, string name)
        {
            var p = new Product
            {
                ProductID = id,
                ProductCode = code,
                ProductName = name
            };
            db.Products.Add(p);
            db.SaveChanges();
            return p;
        }

        private static void SeedProductDetailUom(SaoKimDBContext db, int productId, string? unit, int detailId, DateTime createAtUtc)
        {
            db.ProductDetails.Add(new ProductDetail
            {
                Id = detailId,
                ProductID = productId,
                Unit = unit,
                Price = 10,
                Quantity = 100,
                Status = "Active",
                CreateAt = createAtUtc
            });
            db.SaveChanges();
        }

        private static Order SeedOrder(
            SaoKimDBContext db,
            int orderId,
            int userId,
            decimal total,
            string status,
            string paymentMethod = "COD",
            DateTime? createdAtUtc = null)
        {
            var o = new Order
            {
                OrderId = orderId,
                UserId = userId,
                Total = total,
                Status = status,
                PaymentMethod = paymentMethod,
                CreatedAt = createdAtUtc ?? DateTime.UtcNow,
                Subtotal = total,
                DiscountAmount = 0,
                ShippingFee = 0,
                VatAmount = 0
            };

            db.Orders.Add(o);
            db.SaveChanges();
            return o;
        }

        private static void SeedOrderItem(SaoKimDBContext db, int orderId, int productId, int qty, decimal unitPrice)
        {
            db.OrderItems.Add(new OrderItem
            {
                OrderId = orderId,
                ProductId = productId,
                Quantity = qty,
                UnitPrice = unitPrice
            });
            db.SaveChanges();
        }

        private static void SeedConfirmedDispatchForOrder(SaoKimDBContext db, int orderId)
        {
            db.Set<RetailDispatch>().Add(new RetailDispatch
            {
                DispatchDate = DateTime.UtcNow,
                Status = DispatchStatus.Confirmed,
                ReferenceNo = $"ORD-{orderId}",
                CustomerId = null,
                CustomerName = "Any",
                ConfirmedAt = DateTime.UtcNow,
                Items = new List<DispatchItem>()
            });
            db.SaveChanges();
        }

        private static void SeedUnconfirmedDispatchForOrder(SaoKimDBContext db, int orderId)
        {
            db.Set<RetailDispatch>().Add(new RetailDispatch
            {
                DispatchDate = DateTime.UtcNow,
                Status = DispatchStatus.Draft,
                ReferenceNo = $"ORD-{orderId}",
                CustomerId = null,
                CustomerName = "Any",
                ConfirmedAt = null,
                Items = new List<DispatchItem>()
            });
            db.SaveChanges();
        }

        [Fact]
        public async Task GetListAsync_Clamps_Page_And_PageSize()
        {
            using var db = CreateDbContext();
            var cus = SeedCustomer(db);

            SeedOrder(db, 1, cus.UserID, 100, "Pending", createdAtUtc: DateTime.UtcNow.AddDays(-1));
            SeedOrder(db, 2, cus.UserID, 200, "Pending", createdAtUtc: DateTime.UtcNow);

            var service = CreateService(db);

            var res = await service.GetListAsync(
                q: null,
                status: null,
                createdFrom: null,
                createdTo: null,
                sortBy: "created",
                sortDir: "desc",
                page: 0,
                pageSize: 1000);

            Assert.Equal(1, res.Page);
            Assert.InRange(res.PageSize, 1, 200);
            Assert.Equal(2, res.TotalItems);
            Assert.Equal(2, res.Items.Count());
        }

        [Fact]
        public async Task GetListAsync_Filters_By_Query_Term_Matches_Customer_Email_Phone_Or_OrderId()
        {
            using var db = CreateDbContext();

            var cus = SeedCustomer(db, id: 10, name: "Alice", email: "alice@test.com", phone: "0901234567");
            SeedOrder(db, 123, cus.UserID, 100, "Pending");
            SeedOrder(db, 999, cus.UserID, 200, "Pending");

            var service = CreateService(db);

            var all = await service.GetListAsync(null, null, null, null, "created", "desc", 1, 50);
            Assert.Equal(2, all.TotalItems);

            var byOrderId = await service.GetListAsync("999", null, null, null, "created", "desc", 1, 50);
            Assert.Single(byOrderId.Items);
            Assert.Equal(999, byOrderId.Items.Single().Id);

            var byEmail = await service.GetListAsync("alice@test.com", null, null, null, "created", "desc", 1, 50);
            Assert.Equal(2, byEmail.TotalItems);

            var byPhone = await service.GetListAsync("090123", null, null, null, "created", "desc", 1, 50);
            Assert.Equal(2, byPhone.TotalItems);

            var byName = await service.GetListAsync("Alice", null, null, null, "created", "desc", 1, 50);
            Assert.Equal(2, byName.TotalItems);
        }


        [Fact]
        public async Task GetListAsync_Sorts_By_Total_Desc()
        {
            using var db = CreateDbContext();
            var cus = SeedCustomer(db);
            SeedOrder(db, 1, cus.UserID, 100, "Pending", createdAtUtc: DateTime.UtcNow.AddDays(-3));
            SeedOrder(db, 2, cus.UserID, 300, "Pending", createdAtUtc: DateTime.UtcNow.AddDays(-2));
            SeedOrder(db, 3, cus.UserID, 200, "Pending", createdAtUtc: DateTime.UtcNow.AddDays(-1));

            var service = CreateService(db);

            var res = await service.GetListAsync(
                q: null, status: null, createdFrom: null, createdTo: null,
                sortBy: "total", sortDir: "desc",
                page: 1, pageSize: 50);

            var totals = res.Items.Select(x => x.Total).ToList();
            var sorted = totals.OrderByDescending(x => x).ToList();
            Assert.Equal(sorted, totals);
        }

        [Fact]
        public async Task GetListAsync_Sets_DispatchConfirmed_When_Dispatch_Is_Confirmed()
        {
            using var db = CreateDbContext();
            var cus = SeedCustomer(db);
            SeedOrder(db, 10, cus.UserID, 100, "Pending");
            SeedOrder(db, 11, cus.UserID, 100, "Pending");

            SeedConfirmedDispatchForOrder(db, 10);
            SeedUnconfirmedDispatchForOrder(db, 11);

            var service = CreateService(db);

            var res = await service.GetListAsync(
                q: null, status: null, createdFrom: null, createdTo: null,
                sortBy: "created", sortDir: "desc",
                page: 1, pageSize: 50);

            var map = res.Items.ToDictionary(x => x.Id, x => x.DispatchConfirmed);
            Assert.True(map[10]);
            Assert.False(map[11]);
        }

        [Fact]
        public async Task GetListAsync_Excludes_Orders_Whose_Customer_Is_Deleted()
        {
            using var db = CreateDbContext();

            var role = new Role { Name = "customer" };
            db.Roles.Add(role);
            db.SaveChanges();

            var activeCus = new User
            {
                UserID = 1,
                Name = "Active",
                Email = "a@test.com",
                PhoneNumber = "0900",
                RoleId = role.RoleId,
                DeletedAt = null,
                Status = "Active",
                CreateAt = DateTime.UtcNow
            };
            var deletedCus = new User
            {
                UserID = 2,
                Name = "Deleted",
                Email = "d@test.com",
                PhoneNumber = "0901",
                RoleId = role.RoleId,
                DeletedAt = DateTime.UtcNow,
                Status = "Active",
                CreateAt = DateTime.UtcNow
            };
            db.Users.AddRange(activeCus, deletedCus);
            db.SaveChanges();

            SeedOrder(db, 1, activeCus.UserID, 100, "Pending");
            SeedOrder(db, 2, deletedCus.UserID, 200, "Pending");

            var service = CreateService(db);

            var res = await service.GetListAsync(null, null, null, null, "created", "desc", 1, 50);

            Assert.Single(res.Items);
            Assert.Equal(1, res.Items.Single().Id);
        }

        [Fact]
        public async Task GetByIdAsync_Returns_Null_When_NotFound()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var dto = await service.GetByIdAsync(999);
            Assert.Null(dto);
        }

        [Fact]
        public async Task GetByIdAsync_Maps_Items_And_Invoice_Summary()
        {
            using var db = CreateDbContext();
            var cus = SeedCustomer(db, id: 7, name: "Bob", email: "bob@test.com", phone: "0909");
            var p1 = SeedProduct(db, 1, "P001", "Prod 1");
            var p2 = SeedProduct(db, 2, "P002", "Prod 2");

            var order = SeedOrder(db, 100, cus.UserID, 0, "Pending", createdAtUtc: DateTime.UtcNow.AddDays(-1));
            SeedOrderItem(db, order.OrderId, p1.ProductID, 2, 10);
            SeedOrderItem(db, order.OrderId, p2.ProductID, 1, 25);

            db.Invoices.Add(new Invoice
            {
                Code = "INV-TEST-100",
                CreatedAt = DateTime.UtcNow,
                OrderId = order.OrderId,
                CustomerId = cus.UserID,
                CustomerName = cus.Name,
                Email = cus.Email,
                Phone = cus.PhoneNumber,
                Subtotal = 45,
                Discount = 0,
                Tax = 0,
                ShippingFee = 0,
                Total = 45,
                Status = InvoiceStatus.Paid,
                Items = new List<InvoiceItem>()
            });
            db.SaveChanges();

            var service = CreateService(db);

            var dto = await service.GetByIdAsync(100);

            Assert.NotNull(dto);
            Assert.Equal(100, dto!.Id);
            Assert.Equal("ORD-100", dto.Code);
            Assert.Equal(cus.UserID, dto.CustomerId);
            Assert.Equal("Bob", dto.CustomerName);

            Assert.NotNull(dto.Invoice);
            Assert.Equal("INV-TEST-100", dto.Invoice!.Code);

            Assert.NotNull(dto.Items);
            Assert.Equal(2 + 1, dto.Items.Sum(x => x.Quantity));
            Assert.Contains(dto.Items, x => x.ProductCode == "P001" && x.LineTotal == 20);
            Assert.Contains(dto.Items, x => x.ProductCode == "P002" && x.LineTotal == 25);
        }

        [Fact]
        public async Task UpdateStatusAsync_Throws_When_Status_Empty()
        {
            using var db = CreateDbContext();
            var rt = new Mock<IRealtimePublisher>(MockBehavior.Strict);
            rt.Setup(x => x.PublishAsync(It.IsAny<string>(), It.IsAny<object>())).Returns(Task.CompletedTask);
            rt.Setup(x => x.PublishToRoleAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>())).Returns(Task.CompletedTask);
            rt.Setup(x => x.PublishToUserAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<object>())).Returns(Task.CompletedTask);
            rt.Setup(x => x.PublishToWarehouseAsync(It.IsAny<string>(), It.IsAny<object>())).Returns(Task.CompletedTask);

            var service = CreateService(db, rtMock: rt);

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateStatusAsync(1, "   "));
            Assert.Contains("Status is required", ex.Message);
        }

        [Fact]
        public async Task UpdateStatusAsync_Throws_When_Status_Invalid()
        {
            using var db = CreateDbContext();
            var cus = SeedCustomer(db);
            SeedOrder(db, 1, cus.UserID, 100, "Pending");

            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateStatusAsync(1, "NotAStatus"));
            Assert.Contains("Invalid status", ex.Message);
        }

        [Fact]
        public async Task UpdateStatusAsync_Throws_When_QR_And_NewStatus_Paid()
        {
            using var db = CreateDbContext();
            var cus = SeedCustomer(db);
            SeedOrder(db, 1, cus.UserID, 100, "Pending", paymentMethod: "QR");

            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateStatusAsync(1, "Paid"));
            Assert.Contains("thanh toán QR", ex.Message);
        }

        [Fact]
        public async Task UpdateStatusAsync_Throws_When_COD_Completed_But_Not_Paid_Yet()
        {
            using var db = CreateDbContext();
            var cus = SeedCustomer(db);
            SeedOrder(db, 1, cus.UserID, 100, "Pending", paymentMethod: "COD");

            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateStatusAsync(1, "Completed"));
            Assert.Contains("Đơn COD", ex.Message);
        }

        [Fact]
        public async Task UpdateStatusAsync_Throws_When_Dispatch_Not_Confirmed_And_Not_Cancelling()
        {
            using var db = CreateDbContext();
            var cus = SeedCustomer(db);
            SeedOrder(db, 1, cus.UserID, 100, "Paid", paymentMethod: "COD"); // Paid to pass COD rule for Completed/Shipping etc.

            // dispatch exists but not confirmed
            SeedUnconfirmedDispatchForOrder(db, 1);

            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateStatusAsync(1, "Shipping"));
            Assert.Contains("Kho chưa xác nhận", ex.Message);
        }

        [Fact]
        public async Task UpdateStatusAsync_Allows_Cancelling_Even_If_Dispatch_Not_Confirmed()
        {
            using var db = CreateDbContext();
            var cus = SeedCustomer(db);
            SeedOrder(db, 1, cus.UserID, 100, "Pending", paymentMethod: "COD");

            // No dispatch at all - still should allow Cancelled
            var service = CreateService(db);

            await service.UpdateStatusAsync(1, "Cancelled");

            var order = await db.Orders.FirstAsync(x => x.OrderId == 1);
            Assert.Equal("Cancelled", order.Status);
        }

        [Fact]
        public async Task UpdateStatusAsync_Creates_Invoice_When_Completed_And_No_Invoice_And_Publishes()
        {
            using var db = CreateDbContext();

            var cus = SeedCustomer(db, id: 5, name: "Cus", email: "cus@test.com", phone: "0900");
            var p1 = SeedProduct(db, 1, "P001", "Prod 1");
            var p2 = SeedProduct(db, 2, "P002", "Prod 2");

            // product details for UOM resolution
            SeedProductDetailUom(db, p1.ProductID, "box", detailId: 1, createAtUtc: DateTime.UtcNow.AddDays(-2));
            SeedProductDetailUom(db, p2.ProductID, null, detailId: 2, createAtUtc: DateTime.UtcNow.AddDays(-1)); // fallback to pcs

            var order = SeedOrder(db, 77, cus.UserID, total: 0, status: "Paid", paymentMethod: "COD");
            order.DiscountAmount = 5;
            order.ShippingFee = 7;
            db.SaveChanges();

            SeedOrderItem(db, order.OrderId, p1.ProductID, qty: 2, unitPrice: 20); // 40
            SeedOrderItem(db, order.OrderId, p2.ProductID, qty: 1, unitPrice: 10); // 10
            // subtotal = 50; discount = 5; taxBase=45; tax=round(4.5)->5; shipping=7; total=50-5+5+7=57

            SeedConfirmedDispatchForOrder(db, order.OrderId);

            var rt = new Mock<IRealtimePublisher>(MockBehavior.Strict);
            rt.Setup(x => x.PublishAsync("order.status.updated", It.IsAny<object>())).Returns(Task.CompletedTask);
            rt.Setup(x => x.PublishToRoleAsync("staff", "order.status.updated", It.IsAny<object>())).Returns(Task.CompletedTask);
            rt.Setup(x => x.PublishToRoleAsync("admin", "order.status.updated", It.IsAny<object>())).Returns(Task.CompletedTask);
            rt.Setup(x => x.PublishToUserAsync(cus.UserID, "order.status.updated", It.IsAny<object>())).Returns(Task.CompletedTask);
            rt.Setup(x => x.PublishToWarehouseAsync(It.IsAny<string>(), It.IsAny<object>())).Returns(Task.CompletedTask);

            var service = CreateService(db, rtMock: rt);

            await service.UpdateStatusAsync(order.OrderId, "Completed");

            var updated = await db.Orders.Include(o => o.Invoice).FirstAsync(o => o.OrderId == order.OrderId);
            Assert.Equal("Completed", updated.Status);

            var inv = await db.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.OrderId == order.OrderId);
            Assert.NotNull(inv);

            Assert.Equal(50m, inv!.Subtotal);
            Assert.Equal(5m, inv.Discount);
            Assert.Equal(5m, inv.Tax);
            Assert.Equal(7m, inv.ShippingFee);
            Assert.Equal(57m, inv.Total);

            Assert.Equal(2, inv.Items.Count);
            var item1 = inv.Items.First(x => x.ProductId == p1.ProductID);
            var item2 = inv.Items.First(x => x.ProductId == p2.ProductID);

            Assert.Equal("box", item1.Uom);
            Assert.Equal("pcs", item2.Uom);

            rt.Verify(x => x.PublishAsync("order.status.updated", It.IsAny<object>()), Times.Once);
            rt.Verify(x => x.PublishToRoleAsync("staff", "order.status.updated", It.IsAny<object>()), Times.Once);
            rt.Verify(x => x.PublishToRoleAsync("admin", "order.status.updated", It.IsAny<object>()), Times.Once);
            rt.Verify(x => x.PublishToUserAsync(cus.UserID, "order.status.updated", It.IsAny<object>()), Times.Once);
        }

        [Fact]
        public async Task UpdateStatusAsync_Throws_When_Completed_Order_Trying_To_Change_Back()
        {
            using var db = CreateDbContext();
            var cus = SeedCustomer(db);
            SeedOrder(db, 1, cus.UserID, 100, "Completed", paymentMethod: "COD");

            // even if dispatch confirmed, completed cannot change status
            SeedConfirmedDispatchForOrder(db, 1);

            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateStatusAsync(1, "Shipping"));
            Assert.Contains("Completed order cannot change status", ex.Message);
        }

        [Fact]
        public async Task DeleteAsync_Throws_When_Order_NotFound()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<KeyNotFoundException>(() => service.DeleteAsync(999));
            Assert.Contains("Order not found", ex.Message);
        }

        [Fact]
        public async Task DeleteAsync_Throws_When_Status_Not_Cancelled()
        {
            using var db = CreateDbContext();
            var cus = SeedCustomer(db);
            SeedOrder(db, 1, cus.UserID, 100, "Pending");

            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.DeleteAsync(1));
            Assert.Contains("Chỉ được xóa đơn hàng", ex.Message);
        }

        [Fact]
        public async Task DeleteAsync_Throws_When_Order_Has_Invoice()
        {
            using var db = CreateDbContext();
            var cus = SeedCustomer(db);
            var order = SeedOrder(db, 1, cus.UserID, 100, "Cancelled");

            db.Invoices.Add(new Invoice
            {
                Code = "INV-1",
                CreatedAt = DateTime.UtcNow,
                OrderId = order.OrderId,
                CustomerId = cus.UserID,
                CustomerName = cus.Name,
                Email = cus.Email,
                Phone = cus.PhoneNumber,
                Subtotal = 100,
                Discount = 0,
                Tax = 0,
                ShippingFee = 0,
                Total = 100,
                Status = InvoiceStatus.Paid,
                Items = new List<InvoiceItem>()
            });
            db.SaveChanges();

            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.DeleteAsync(1));
            Assert.Contains("đã có hóa đơn", ex.Message);
        }

        [Fact]
        public async Task DeleteAsync_Deletes_Order_And_Items_And_Calls_DeleteDispatchSlipAsync_And_Publishes()
        {
            using var db = CreateDbContext();
            var cus = SeedCustomer(db);

            var order = SeedOrder(db, 10, cus.UserID, 100, "Cancelled");
            var p = SeedProduct(db, 1, "P001", "Prod");

            SeedOrderItem(db, order.OrderId, p.ProductID, qty: 2, unitPrice: 10);

            // dispatches referencing ORD-10
            var d1 = new RetailDispatch
            {
                DispatchDate = DateTime.UtcNow,
                Status = DispatchStatus.Draft,
                ReferenceNo = $"ORD-{order.OrderId}",
                CustomerName = "Any",
                Items = new List<DispatchItem>()
            };
            var d2 = new RetailDispatch
            {
                DispatchDate = DateTime.UtcNow,
                Status = DispatchStatus.Draft,
                ReferenceNo = $"ORD-{order.OrderId}",
                CustomerName = "Any",
                Items = new List<DispatchItem>()
            };
            db.Set<RetailDispatch>().AddRange(d1, d2);
            db.SaveChanges();

            var dispatch = new Mock<IDispatchService>(MockBehavior.Strict);
            dispatch.Setup(x => x.DeleteDispatchSlipAsync(d1.Id)).Returns(Task.CompletedTask);
            dispatch.Setup(x => x.DeleteDispatchSlipAsync(d2.Id)).Returns(Task.CompletedTask);

            var rt = new Mock<IRealtimePublisher>(MockBehavior.Strict);
            rt.Setup(x => x.PublishToRoleAsync("staff", "order.deleted", It.IsAny<object>())).Returns(Task.CompletedTask);
            rt.Setup(x => x.PublishToRoleAsync("admin", "order.deleted", It.IsAny<object>())).Returns(Task.CompletedTask);
            rt.Setup(x => x.PublishAsync(It.IsAny<string>(), It.IsAny<object>())).Returns(Task.CompletedTask);
            rt.Setup(x => x.PublishToUserAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<object>())).Returns(Task.CompletedTask);
            rt.Setup(x => x.PublishToWarehouseAsync(It.IsAny<string>(), It.IsAny<object>())).Returns(Task.CompletedTask);

            var service = CreateService(db, dispatchMock: dispatch, rtMock: rt);

            await service.DeleteAsync(order.OrderId);

            Assert.False(await db.Orders.AnyAsync(o => o.OrderId == order.OrderId));
            Assert.False(await db.OrderItems.AnyAsync(oi => oi.OrderId == order.OrderId));

            dispatch.Verify(x => x.DeleteDispatchSlipAsync(d1.Id), Times.Once);
            dispatch.Verify(x => x.DeleteDispatchSlipAsync(d2.Id), Times.Once);

            rt.Verify(x => x.PublishToRoleAsync("staff", "order.deleted", It.IsAny<object>()), Times.Once);
            rt.Verify(x => x.PublishToRoleAsync("admin", "order.deleted", It.IsAny<object>()), Times.Once);

            dispatch.VerifyNoOtherCalls();
            rt.VerifyNoOtherCalls();
        }
    }
}
