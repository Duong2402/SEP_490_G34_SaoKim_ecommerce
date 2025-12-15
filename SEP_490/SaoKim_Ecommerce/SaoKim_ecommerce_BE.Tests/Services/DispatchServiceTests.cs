using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Tests.Services
{
    public class DispatchServiceTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new SaoKimDBContext(options);
        }

        private DispatchService CreateService(SaoKimDBContext db)
        {
            return new DispatchService(db);
        }

        #region ConfirmDispatchSlipAsync

        [Fact]
        public async Task ConfirmDispatchSlipAsync_Throws_When_Slip_Not_Found()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<KeyNotFoundException>(
                () => service.ConfirmDispatchSlipAsync(999));

            Assert.Contains("Phiếu xuất không tồn tại", ex.Message);
        }

        [Fact]
        public async Task ConfirmDispatchSlipAsync_Throws_When_Slip_Not_Draft()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var product = new Product
            {
                ProductName = "P1",
                ProductCode = "P001"
            };
            db.Products.Add(product);
            await db.SaveChangesAsync();

            var slip = new RetailDispatch
            {
                DispatchDate = DateTime.UtcNow,
                Status = DispatchStatus.Confirmed,
                ReferenceNo = "DSP-SLS-00001",
                CustomerId = 1,
                CustomerName = "C1",
                Items = new List<DispatchItem>
        {
            new DispatchItem
            {
                ProductId = product.ProductID,
                ProductName = "P1",
                Uom = "pcs",
                Quantity = 1,
                UnitPrice = 10,
                Total = 10
            }
        }
            };

            db.Set<RetailDispatch>().Add(slip);
            await db.SaveChangesAsync();

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.ConfirmDispatchSlipAsync(slip.Id));

            Assert.Contains("Chỉ bản nháp mới được xác thực", ex.Message);
        }

        [Fact]
        public async Task ConfirmDispatchSlipAsync_Throws_When_No_Items()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var slip = new RetailDispatch
            {
                DispatchDate = DateTime.UtcNow,
                Status = DispatchStatus.Draft,
                ReferenceNo = "DSP-SLS-00001",
                CustomerId = 1,
                CustomerName = "C1",
                Items = new List<DispatchItem>()
            };

            db.Set<RetailDispatch>().Add(slip);
            await db.SaveChangesAsync();

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.ConfirmDispatchSlipAsync(slip.Id));

            Assert.Contains("Phiếu xuất không có sản phẩm để xác nhận", ex.Message);
        }


        [Fact]
        public async Task ConfirmDispatchSlipAsync_Throws_When_Item_ProductId_Null()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var product = new Product
            {
                ProductName = "P1",
                ProductCode = "P001"
            };
            db.Products.Add(product);
            await db.SaveChangesAsync();

            var slip = new RetailDispatch
            {
                DispatchDate = DateTime.UtcNow,
                Status = DispatchStatus.Draft,
                ReferenceNo = "DSP-SLS-00001",
                CustomerId = 1,
                CustomerName = "C1",
                Items = new List<DispatchItem>
        {
            new DispatchItem
            {
                ProductId = null,
                ProductName = "P1",
                Uom = "pcs",
                Quantity = 1,
                UnitPrice = 10,
                Total = 10
            }
        }
            };

            db.Set<RetailDispatch>().Add(slip);
            await db.SaveChangesAsync();

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.ConfirmDispatchSlipAsync(slip.Id));

            Assert.Contains("Tất cả sản phẩm phải có productID", ex.Message);
        }


        [Fact]
        public async Task ConfirmDispatchSlipAsync_Throws_When_Product_Not_Exist()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var product = new Product
            {
                ProductName = "P1",
                ProductCode = "P001"
            };
            db.Products.Add(product);
            await db.SaveChangesAsync();

            var slip = new RetailDispatch
            {
                DispatchDate = DateTime.UtcNow,
                Status = DispatchStatus.Draft,
                ReferenceNo = "DSP-SLS-00001",
                CustomerId = 1,
                CustomerName = "C1",
                Items = new List<DispatchItem>
        {
            new DispatchItem
            {
                ProductId = product.ProductID,
                ProductName = "P1",
                Uom = "pcs",
                Quantity = 1,
                UnitPrice = 10,
                Total = 10
            }
        }
            };

            db.Set<RetailDispatch>().Add(slip);
            await db.SaveChangesAsync();

            db.Products.Remove(product);
            await db.SaveChangesAsync();

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.ConfirmDispatchSlipAsync(slip.Id));

            Assert.Contains("Một vài ID sản phẩm không tìm thấy", ex.Message);
        }


        [Fact]
        public async Task ConfirmDispatchSlipAsync_Throws_When_Insufficient_Stock()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var product = new Product
            {
                ProductName = "P1",
                ProductCode = "P001"
            };
            db.Products.Add(product);
            await db.SaveChangesAsync();

            db.ProductDetails.Add(new ProductDetail
            {
                ProductID = product.ProductID,
                Quantity = 2,
                Price = 10,
                Status = "Active",
                CreateAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            var slip = new RetailDispatch
            {
                DispatchDate = DateTime.UtcNow,
                Status = DispatchStatus.Draft,
                CustomerId = null,
                CustomerName = "C1",
                ReferenceNo = "DSP-SLS-00001",
                Note = "Test thiếu hàng",
                Items = new List<DispatchItem>
        {
            new DispatchItem
            {
                ProductId = product.ProductID,
                ProductName = "P1",
                Uom = "pcs",
                Quantity = 5,
                UnitPrice = 10,
                Total = 50
            }
        }
            };

            db.Set<RetailDispatch>().Add(slip);
            await db.SaveChangesAsync();

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.ConfirmDispatchSlipAsync(slip.Id));

            Assert.Contains("Không đủ hàng cho một số sản phẩm", ex.Message);
        }


        [Fact]
        public async Task ConfirmDispatchSlipAsync_Confirm_Success_Updates_Status_And_Inventory()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var product = new Product
            {
                ProductName = "P1",
                ProductCode = "P001"
            };
            db.Products.Add(product);
            await db.SaveChangesAsync();

            db.ProductDetails.Add(new ProductDetail
            {
                ProductID = product.ProductID,
                Quantity = 10,
                Price = 10,
                Status = "Active",
                CreateAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            var slip = new RetailDispatch
            {
                DispatchDate = DateTime.UtcNow,
                Status = DispatchStatus.Draft,
                CustomerId = null,
                CustomerName = "C1",
                ReferenceNo = "DSP-SLS-00001",
                Note = "Test",
                Items = new List<DispatchItem>
        {
            new DispatchItem
            {
                ProductId = product.ProductID,
                ProductName = "P1",
                Uom = "pcs",
                Quantity = 3,
                UnitPrice = 10,
                Total = 30
            }
        }
            };

            db.Set<RetailDispatch>().Add(slip);
            await db.SaveChangesAsync();

            var result = await service.ConfirmDispatchSlipAsync(slip.Id);

            var updatedSlip = await db.Dispatches.FirstAsync(d => d.Id == slip.Id);
            Assert.Equal(DispatchStatus.Confirmed, updatedSlip.Status);
            Assert.NotNull(updatedSlip.ConfirmedAt);

            var detail = await db.ProductDetails.FirstAsync(d => d.ProductID == product.ProductID);
            Assert.Equal(10 - 3, detail.Quantity);

            Assert.NotNull(result);
            Assert.Equal(slip.Id, result.Id);
            Assert.Equal(DispatchStatus.Confirmed, result.Status);
            Assert.Single(result.AffectedProducts);
            Assert.Equal(product.ProductID, result.AffectedProducts[0].ProductId);
            Assert.Equal(3, result.AffectedProducts[0].DeductedQty);
        }


        [Fact]
        public async Task ConfirmDispatchSlipAsync_Throws_When_Order_Cancelled()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var product = new Product
            {
                ProductName = "P1",
                ProductCode = "P001"
            };
            db.Products.Add(product);
            await db.SaveChangesAsync();

            db.ProductDetails.Add(new ProductDetail
            {
                ProductID = product.ProductID,
                Quantity = 10,
                Price = 10,
                Status = "Active",
                CreateAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            db.Orders.Add(new Order
            {
                OrderId = 100,
                Status = "Cancelled",
                Total = 20,
                UserId = 1
            });
            await db.SaveChangesAsync();

            var slip = new RetailDispatch
            {
                DispatchDate = DateTime.UtcNow,
                Status = DispatchStatus.Draft,
                ReferenceNo = "ORD-100",
                CustomerId = 1,
                CustomerName = "C1",
                Note = "Test cancelled order",
                Items = new List<DispatchItem>
        {
            new DispatchItem
            {
                ProductId = product.ProductID,
                ProductName = "P1",
                Uom = "pcs",
                Quantity = 2,
                UnitPrice = 10,
                Total = 20
            }
        }
            };

            db.Set<RetailDispatch>().Add(slip);
            await db.SaveChangesAsync();

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.ConfirmDispatchSlipAsync(slip.Id));

            Assert.Contains("Đơn hàng đã bị hủy, không thể xác nhận phiếu xuất", ex.Message);
        }

        [Fact]
        public async Task ConfirmDispatchSlipAsync_Sets_Order_Status_Pending_When_Paid()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var product = new Product
            {
                ProductName = "P1",
                ProductCode = "P001"
            };
            db.Products.Add(product);
            await db.SaveChangesAsync();

            db.ProductDetails.Add(new ProductDetail
            {
                ProductID = product.ProductID,
                Quantity = 10,
                Price = 10,
                Status = "Active",
                CreateAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            db.Orders.Add(new Order
            {
                OrderId = 200,
                Status = "Paid",
                Total = 20,
                UserId = 1
            });
            await db.SaveChangesAsync();

            var slip = new RetailDispatch
            {
                DispatchDate = DateTime.UtcNow,
                Status = DispatchStatus.Draft,
                ReferenceNo = "ORD-200",
                CustomerId = 1,
                CustomerName = "C1",
                Note = "Test order paid",
                Items = new List<DispatchItem>
        {
            new DispatchItem
            {
                ProductId = product.ProductID,
                ProductName = "P1",
                Uom = "pcs",
                Quantity = 2,
                UnitPrice = 10,
                Total = 20
            }
        }
            };

            db.Set<RetailDispatch>().Add(slip);
            await db.SaveChangesAsync();

            await service.ConfirmDispatchSlipAsync(slip.Id);

            var order = await db.Orders.FirstAsync(o => o.OrderId == 200);
            Assert.Equal("Pending", order.Status);
        }


        #endregion

        #region CreateSalesDispatchAsync

        [Fact]
        public async Task CreateSalesDispatchAsync_Throws_When_CustomerId_Invalid()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var dto = new RetailDispatchCreateDto
            {
                CustomerId = null
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(
                () => service.CreateSalesDispatchAsync(dto));

            Assert.Contains("Vui lòng điền Customer ID", ex.Message);
        }

        [Fact]
        public async Task CreateSalesDispatchAsync_Throws_When_No_Customer_Role()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var dto = new RetailDispatchCreateDto
            {
                CustomerId = 1,
                DispatchDate = DateTime.UtcNow,
                Items = new List<DispatchItemDto>
                {
                    new DispatchItemDto
                    {
                        ProductId = 1,
                        ProductName = "P1",
                        Quantity = 1,
                        UnitPrice = 10,
                        Uom = "pcs"
                    }
                }
            };

            var ex = await Assert.ThrowsAsync<KeyNotFoundException>(
                () => service.CreateSalesDispatchAsync(dto));

            Assert.Contains("Không tìm thấy customer", ex.Message);
        }

        [Fact]
        public async Task CreateSalesDispatchAsync_Throws_When_Customer_Not_Found()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var customerRole = new Role { Name = "customer" };
            db.Roles.Add(customerRole);
            await db.SaveChangesAsync();

            var dto = new RetailDispatchCreateDto
            {
                CustomerId = 999,
                DispatchDate = DateTime.UtcNow,
                Items = new List<DispatchItemDto>
                {
                    new DispatchItemDto
                    {
                        ProductId = 1,
                        ProductName = "P1",
                        Quantity = 1,
                        UnitPrice = 10,
                        Uom = "pcs"
                    }
                }
            };

            var ex = await Assert.ThrowsAsync<KeyNotFoundException>(
                () => service.CreateSalesDispatchAsync(dto));

            Assert.Contains("Customer 999 không tìm thấy", ex.Message);
        }

        [Fact]
        public async Task CreateSalesDispatchAsync_Throws_When_No_Items()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var customerRole = new Role { Name = "customer" };
            db.Roles.Add(customerRole);
            await db.SaveChangesAsync();
            var customer = new User
            {
                Name = "C1",
                Email = "c1@test.com",
                RoleId = customerRole.RoleId
            };
            db.Users.Add(customer);
            await db.SaveChangesAsync();

            var dto = new RetailDispatchCreateDto
            {
                CustomerId = customer.UserID,
                DispatchDate = DateTime.UtcNow,
                Items = new List<DispatchItemDto>()
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(
                () => service.CreateSalesDispatchAsync(dto));

            Assert.Contains("Phiếu xuất bán phải có ít nhất 1 sản phẩm", ex.Message);
        }

        [Fact]
        public async Task CreateSalesDispatchAsync_Creates_Slip_With_Auto_Reference_And_Items()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var customerRole = new Role { Name = "customer" };
            db.Roles.Add(customerRole);
            await db.SaveChangesAsync();
            var customer = new User
            {
                Name = "C1",
                Email = "c1@test.com",
                RoleId = customerRole.RoleId
            };
            db.Users.Add(customer);

            db.Products.Add(new Product
            {
                ProductName = "P1",
                ProductCode = "P001"
            });

            await db.SaveChangesAsync();

            var product = await db.Products.FirstAsync();

            var dto = new RetailDispatchCreateDto
            {
                CustomerId = customer.UserID,
                DispatchDate = new DateTime(2025, 1, 1),
                Note = "Test slip",
                Items = new List<DispatchItemDto>
                {
                    new DispatchItemDto
                    {
                        ProductId = product.ProductID,
                        ProductName = "P1",
                        Quantity = 2,
                        UnitPrice = 10,
                        Uom = "pcs"
                    }
                }
            };

            var slip = await service.CreateSalesDispatchAsync(dto);

            Assert.NotNull(slip);
            Assert.Equal(customer.UserID, slip.CustomerId);
            Assert.Equal("Test slip", slip.Note);
            Assert.Equal(DispatchStatus.Draft, slip.Status);
            Assert.False(string.IsNullOrWhiteSpace(slip.ReferenceNo));
            Assert.StartsWith("DSP-SLS-", slip.ReferenceNo);

            var items = await db.DispatchItems.Where(i => i.DispatchId == slip.Id).ToListAsync();
            Assert.Single(items);
            var item = items[0];
            Assert.Equal(product.ProductID, item.ProductId);
            Assert.Equal(2, item.Quantity);
            Assert.Equal(10, item.UnitPrice);
            Assert.Equal(20, item.Total);
        }

        #endregion

        #region ExportDispatchSlipsAsync

        [Fact]
        public async Task ExportDispatchSlipsAsync_Throws_When_Ids_Empty()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var ex = await Assert.ThrowsAsync<ArgumentException>(
                () => service.ExportDispatchSlipsAsync(new List<int>(), true));

            Assert.Contains("Không có phiếu xuất để export", ex.Message);
        }

        [Fact]
        public async Task ExportDispatchSlipsAsync_Returns_Bytes_When_Has_Data()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var retail = new RetailDispatch
            {
                DispatchDate = new DateTime(2025, 1, 1),
                CustomerName = "C1",
                Status = DispatchStatus.Draft,
                ReferenceNo = "DSP-SLS-00001",
                CreatedAt = DateTime.UtcNow
            };
            db.Set<RetailDispatch>().Add(retail);

            var project = new ProjectDispatch
            {
                DispatchDate = new DateTime(2025, 1, 2),
                ProjectName = "PJ1",
                Status = DispatchStatus.Draft,
                ReferenceNo = "DSP-PRJ-00001",
                CreatedAt = DateTime.UtcNow
            };
            db.Set<ProjectDispatch>().Add(project);

            db.Products.Add(new Product
            {
                ProductName = "P1",
                ProductCode = "P001"
            });

            await db.SaveChangesAsync();

            var product = await db.Products.FirstAsync();

            db.DispatchItems.Add(new DispatchItem
            {
                DispatchId = retail.Id,
                ProductId = product.ProductID,
                ProductName = "P1",
                Uom = "pcs",
                Quantity = 2,
                UnitPrice = 10,
                Total = 20
            });

            await db.SaveChangesAsync();

            var bytes = await service.ExportDispatchSlipsAsync(
                new List<int> { retail.Id, project.Id },
                includeItems: true);

            Assert.NotNull(bytes);
            Assert.True(bytes.Length > 0);
        }

        #endregion
    }
}
