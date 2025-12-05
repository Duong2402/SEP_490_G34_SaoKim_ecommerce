using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Moq;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Hubs;
using SaoKim_ecommerce_BE.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace SaoKim_ecommerce_BE.Tests.Services
{
    public class ReceivingServiceTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new SaoKimDBContext(options);
        }

        private ReceivingService CreateService(SaoKimDBContext db)
        {
            var hubClients = new Mock<IHubClients>();
            var clientProxy = new Mock<IClientProxy>();

            clientProxy
                .Setup(c => c.SendCoreAsync(
                    It.IsAny<string>(),
                    It.IsAny<object?[]>(),
                    It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            hubClients
                .Setup(c => c.All)
                .Returns(clientProxy.Object);

            var hubContext = new Mock<IHubContext<ReceivingHub>>();
            hubContext
                .Setup(h => h.Clients)
                .Returns(hubClients.Object);

            return new ReceivingService(db, hubContext.Object);
        }

        private void SeedBasicMasterData(SaoKimDBContext db)
        {
            db.UnitOfMeasures.Add(new UnitOfMeasure
            {
                Id = 1,
                Name = "pcs",
                Status = "Active"
            });

            db.Products.Add(new Product
            {
                ProductID = 1,
                ProductName = "Product 1",
                ProductCode = "P001"
            });

            db.SaveChanges();
        }

        #region CreateReceivingSlipAsync

        [Fact]
        public async Task CreateReceivingSlipAsync_Throws_When_Supplier_Empty()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var dto = new ReceivingSlipCreateDto
            {
                Supplier = "   ",
                ReceiptDate = DateTime.UtcNow,
                Items = new List<ReceivingSlipItemDto>
                {
                    new ReceivingSlipItemDto
                    {
                        ProductId = 1,
                        ProductName = "P1",
                        Uom = "pcs",
                        Quantity = 1,
                        UnitPrice = 10
                    }
                }
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(
                () => service.CreateReceivingSlipAsync(dto));

            Assert.Contains("nhà cung cấp", ex.Message);
        }

        [Fact]
        public async Task CreateReceivingSlipAsync_Throws_When_Items_Empty()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var dto = new ReceivingSlipCreateDto
            {
                Supplier = "ABC",
                ReceiptDate = DateTime.UtcNow,
                Items = new List<ReceivingSlipItemDto>() // rỗng
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(
                () => service.CreateReceivingSlipAsync(dto));

            Assert.Contains("Phải có ít nhất 1 sản phẩm", ex.Message);
        }

        [Fact]
        public async Task CreateReceivingSlipAsync_Throws_When_Uom_Not_Found()
        {
            using var db = CreateDbContext();
            // không seed UnitOfMeasures
            db.Products.Add(new Product
            {
                ProductID = 1,
                ProductName = "P1",
                ProductCode = "P001"
            });
            db.SaveChanges();

            var service = CreateService(db);

            var dto = new ReceivingSlipCreateDto
            {
                Supplier = "ABC",
                ReceiptDate = DateTime.UtcNow,
                Items = new List<ReceivingSlipItemDto>
                {
                    new ReceivingSlipItemDto
                    {
                        ProductId = 1,
                        ProductName = "P1",
                        Uom = "pcs", // không có trong DB
                        Quantity = 2,
                        UnitPrice = 10
                    }
                }
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(
                () => service.CreateReceivingSlipAsync(dto));

            Assert.Contains("Đơn vị tính 'pcs' không tìm thấy", ex.Message);
        }

        [Fact]
        public async Task CreateReceivingSlipAsync_Throws_When_ProductId_Missing()
        {
            using var db = CreateDbContext();
            db.UnitOfMeasures.Add(new UnitOfMeasure
            {
                Id = 1,
                Name = "pcs",
                Status = "Active"
            });
            db.SaveChanges();

            var service = CreateService(db);

            var dto = new ReceivingSlipCreateDto
            {
                Supplier = "ABC",
                ReceiptDate = DateTime.UtcNow,
                Items = new List<ReceivingSlipItemDto>
                {
                    new ReceivingSlipItemDto
                    {
                        ProductId = null, // hoặc <= 0
                        ProductName = "P1",
                        Uom = "pcs",
                        Quantity = 2,
                        UnitPrice = 10
                    }
                }
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(
                () => service.CreateReceivingSlipAsync(dto));

            Assert.Contains("Vui lòng chọn sản phẩm", ex.Message);
        }

        [Fact]
        public async Task CreateReceivingSlipAsync_Throws_When_Product_Not_Found()
        {
            using var db = CreateDbContext();
            db.UnitOfMeasures.Add(new UnitOfMeasure
            {
                Id = 1,
                Name = "pcs",
                Status = "Active"
            });
            db.SaveChanges();
            // không thêm Product

            var service = CreateService(db);

            var dto = new ReceivingSlipCreateDto
            {
                Supplier = "ABC",
                ReceiptDate = DateTime.UtcNow,
                Items = new List<ReceivingSlipItemDto>
                {
                    new ReceivingSlipItemDto
                    {
                        ProductId = 999,
                        ProductName = "P1",
                        Uom = "pcs",
                        Quantity = 2,
                        UnitPrice = 10
                    }
                }
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(
                () => service.CreateReceivingSlipAsync(dto));

            Assert.Contains("Sản phẩm với ID 999 không tìm thấy", ex.Message);
        }

        [Fact]
        public async Task CreateReceivingSlipAsync_Creates_Slip_With_Reference_And_Correct_Totals()
        {
            using var db = CreateDbContext();
            SeedBasicMasterData(db);

            var service = CreateService(db);

            var dto = new ReceivingSlipCreateDto
            {
                Supplier = "Nhà cung cấp A",
                ReceiptDate = new DateTime(2025, 1, 1),
                Note = "Test slip",
                Items = new List<ReceivingSlipItemDto>
        {
            new ReceivingSlipItemDto
            {
                ProductId = 1,
                ProductName = "Product 1",
                Uom = "pcs",
                Quantity = 2,
                UnitPrice = 10
            },
            new ReceivingSlipItemDto
            {
                ProductId = 1,
                ProductName = "Product 1",
                Uom = "pcs",
                Quantity = 3,
                UnitPrice = 20
            }
        }
            };

            var slip = await service.CreateReceivingSlipAsync(dto);

            Assert.NotNull(slip);
            Assert.Equal(ReceivingSlipStatus.Draft, slip.Status);
            Assert.Equal("Nhà cung cấp A", slip.Supplier);
            Assert.Equal(new DateTime(2025, 1, 1), slip.ReceiptDate);

            Assert.False(string.IsNullOrWhiteSpace(slip.ReferenceNo));
            Assert.StartsWith("RCV-", slip.ReferenceNo);
            Assert.Equal(3 + "RCV-".Length, slip.ReferenceNo.Length);

            var items = slip.Items.ToList();
            Assert.Equal(2, items.Count);

            var item1 = items[0];
            var item2 = items[1];

            Assert.Equal(2 * 10, item1.Total);
            Assert.Equal(3 * 20, item2.Total);

            var totalQty = items.Sum(i => i.Quantity);
            var totalAmount = items.Sum(i => i.Total);

            Assert.Equal(5, totalQty);
            Assert.Equal(2 * 10 + 3 * 20, totalAmount);
        }


        #endregion

        #region ConfirmReceivingSlipAsync

        [Fact]
        public async Task ConfirmReceivingSlipAsync_Throws_When_Slip_Not_Found()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<KeyNotFoundException>(
                () => service.ConfirmReceivingSlipAsync(999));

            Assert.Contains("Phiếu nhập không tồn tại", ex.Message);
        }

        [Fact]
        public async Task ConfirmReceivingSlipAsync_Throws_When_Slip_Not_Draft()
        {
            using var db = CreateDbContext();

            db.ReceivingSlips.Add(new ReceivingSlip
            {
                Id = 1,
                Supplier = "A",
                ReceiptDate = DateTime.UtcNow,
                Status = ReceivingSlipStatus.Confirmed,
                Items = new List<ReceivingSlipItem>
                {
                    new ReceivingSlipItem
                    {
                        ProductId = 1,
                        Quantity = 1,
                        UnitPrice = 10,
                        Total = 10
                    }
                }
            });
            await db.SaveChangesAsync();

            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.ConfirmReceivingSlipAsync(1));

            Assert.Contains("Chỉ bản nháp mới được xác thực", ex.Message);
        }

        [Fact]
        public async Task ConfirmReceivingSlipAsync_Throws_When_No_Items()
        {
            using var db = CreateDbContext();

            db.ReceivingSlips.Add(new ReceivingSlip
            {
                Id = 1,
                Supplier = "A",
                ReceiptDate = DateTime.UtcNow,
                Status = ReceivingSlipStatus.Draft,
                Items = new List<ReceivingSlipItem>()
            });
            await db.SaveChangesAsync();

            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<ArgumentException>(
                () => service.ConfirmReceivingSlipAsync(1));

            Assert.Contains("Phiếu nhập không có sản phẩm để xác nhận", ex.Message);
        }

        [Fact]
        public async Task ConfirmReceivingSlipAsync_Throws_When_Item_ProductId_Null()
        {
            using var db = CreateDbContext();

            db.ReceivingSlips.Add(new ReceivingSlip
            {
                Id = 1,
                Supplier = "A",
                ReceiptDate = DateTime.UtcNow,
                Status = ReceivingSlipStatus.Draft,
                Items = new List<ReceivingSlipItem>
                {
                    new ReceivingSlipItem
                    {
                        ProductId = null,
                        Quantity = 1,
                        UnitPrice = 10,
                        Total = 10
                    }
                }
            });
            await db.SaveChangesAsync();

            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<ArgumentException>(
                () => service.ConfirmReceivingSlipAsync(1));

            Assert.Contains("Tất cả sản phẩm phải có ProductId", ex.Message);
        }

        [Fact]
        public async Task ConfirmReceivingSlipAsync_Throws_When_Product_Not_Exist()
        {
            using var db = CreateDbContext();

            db.ReceivingSlips.Add(new ReceivingSlip
            {
                Id = 1,
                Supplier = "A",
                ReceiptDate = DateTime.UtcNow,
                Status = ReceivingSlipStatus.Draft,
                Items = new List<ReceivingSlipItem>
                {
                    new ReceivingSlipItem
                    {
                        ProductId = 99,
                        Quantity = 1,
                        UnitPrice = 10,
                        Total = 10
                    }
                }
            });
            await db.SaveChangesAsync();

            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<ArgumentException>(
                () => service.ConfirmReceivingSlipAsync(1));

            Assert.Contains("Một vài ID sản phẩm không tìm thấy", ex.Message);
        }

        [Fact]
        public async Task ConfirmReceivingSlipAsync_Confirm_Success_Updates_Status_And_Inventory()
        {
            using var db = CreateDbContext();

            db.Products.Add(new Product
            {
                ProductID = 1,
                ProductName = "P1",
                ProductCode = "P001"
            });

            db.ProductDetails.Add(new ProductDetail
            {
                ProductID = 1,
                Quantity = 5,
                Status = "Active",
                CreateAt = DateTime.UtcNow.AddDays(-1),
                CreateBy = "seed"
            });

            db.ReceivingSlips.Add(new ReceivingSlip
            {
                Id = 1,
                Supplier = "A",
                ReceiptDate = DateTime.UtcNow,
                Status = ReceivingSlipStatus.Draft,
                Items = new List<ReceivingSlipItem>
                {
                    new ReceivingSlipItem
                    {
                        ProductId = 1,
                        Quantity = 3,
                        UnitPrice = 10,
                        Total = 30
                    }
                }
            });

            await db.SaveChangesAsync();

            var service = CreateService(db);

            var result = await service.ConfirmReceivingSlipAsync(1);

            var slip = await db.ReceivingSlips.FirstAsync(s => s.Id == 1);
            Assert.Equal(ReceivingSlipStatus.Confirmed, slip.Status);
            Assert.NotNull(slip.ConfirmedAt);

            var detail = await db.ProductDetails.FirstAsync(d => d.ProductID == 1);
            Assert.Equal(5 + 3, detail.Quantity);

            Assert.NotNull(result);
            Assert.Equal(1, result.Id);
            Assert.Equal(ReceivingSlipStatus.Confirmed, result.Status);
            Assert.Single(result.AffectedProducts);
            Assert.Equal(1, result.AffectedProducts[0].ProductId);
            Assert.Equal(3, result.AffectedProducts[0].AddedQty);
        }

        #endregion
    }
}
