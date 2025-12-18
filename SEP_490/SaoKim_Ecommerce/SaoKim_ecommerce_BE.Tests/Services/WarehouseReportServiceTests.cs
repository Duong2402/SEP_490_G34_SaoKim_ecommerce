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
using SaoKim_ecommerce_BE.Services.Realtime;

namespace SaoKim_ecommerce_BE.Tests.Services
{
    public class WarehouseReportServiceTests
    {
        private sealed class NoopRealtimePublisher : IRealtimePublisher
        {
            public Task PublishToWarehouseAsync(string type, object data) => Task.CompletedTask;
            public Task PublishAsync(string type, object data) => Task.CompletedTask;
            public Task PublishToUserAsync(int userId, string type, object data) => Task.CompletedTask;
            public Task PublishToRoleAsync(string role, string type, object data) => Task.CompletedTask;
        }

        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new SaoKimDBContext(options);
        }

        private WarehouseReportService CreateService(SaoKimDBContext db)
            => new WarehouseReportService(db, new NoopRealtimePublisher());

        #region Seed helpers

        private Product SeedProduct(SaoKimDBContext db, int id, string code, string name)
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

        private void SeedProductDetail(SaoKimDBContext db, int productId, int id, string? status, int qty, string? unit = "pcs")
        {
            db.ProductDetails.Add(new ProductDetail
            {
                Id = id,
                ProductID = productId,
                Status = status,
                Quantity = qty,
                Unit = unit,
                Price = 10,
                CreateAt = DateTime.UtcNow.AddMinutes(-id)
            });
            db.SaveChanges();
        }

        private ReceivingSlip SeedReceivingSlip(
            SaoKimDBContext db,
            int id,
            string supplier,
            DateTime receiptDateUtc,
            ReceivingSlipStatus status,
            bool isDeleted,
            string? note,
            params (int productId, int qty, decimal unitPrice)[] items)
        {
            var slip = new ReceivingSlip
            {
                Id = id,
                Supplier = supplier,
                ReceiptDate = receiptDateUtc,
                Status = status,
                IsDeleted = isDeleted,
                Note = note,
                ReferenceNo = $"RCV-{id:000}"
            };

            slip.Items = items.Select((x, idx) => new ReceivingSlipItem
            {
                ReceivingSlipId = id,
                ProductId = x.productId,
                Quantity = x.qty,
                UnitPrice = x.unitPrice,
                Total = x.qty * x.unitPrice,
                Uom = "pcs"
            }).ToList();

            db.ReceivingSlips.Add(slip);
            db.SaveChanges();
            return slip;
        }

        private DispatchBase SeedRetailDispatch(
            SaoKimDBContext db,
            int id,
            string referenceNo,
            string customerName,
            DateTime dispatchDateUtc,
            DispatchStatus status,
            bool isDeleted,
            string? note,
            params (int productId, int qty, decimal unitPrice)[] items)
        {
            var slip = new RetailDispatch
            {
                Id = id,
                ReferenceNo = referenceNo,
                CustomerName = customerName,
                DispatchDate = dispatchDateUtc,
                Status = status,
                IsDeleted = isDeleted,
                Note = note
            };

            slip.Items = items.Select(x => new DispatchItem
            {
                DispatchId = id,
                ProductId = x.productId,
                ProductName = $"P{x.productId}",
                Uom = "pcs",
                Quantity = x.qty,
                UnitPrice = x.unitPrice,
                Total = x.qty * x.unitPrice
            }).ToList();

            db.Set<RetailDispatch>().Add((RetailDispatch)slip);
            db.SaveChanges();
            return slip;
        }

        private DispatchBase SeedProjectDispatch(
            SaoKimDBContext db,
            int id,
            string referenceNo,
            string projectName,
            DateTime dispatchDateUtc,
            DispatchStatus status,
            bool isDeleted,
            string? note,
            params (int productId, int qty, decimal unitPrice)[] items)
        {
            var slip = new ProjectDispatch
            {
                Id = id,
                ReferenceNo = referenceNo,
                ProjectName = projectName,
                DispatchDate = dispatchDateUtc,
                Status = status,
                IsDeleted = isDeleted,
                Note = note
            };

            slip.Items = items.Select(x => new DispatchItem
            {
                DispatchId = id,
                ProductId = x.productId,
                ProductName = $"P{x.productId}",
                Uom = "pcs",
                Quantity = x.qty,
                UnitPrice = x.unitPrice,
                Total = x.qty * x.unitPrice
            }).ToList();

            db.Set<ProjectDispatch>().Add((ProjectDispatch)slip);
            db.SaveChanges();
            return slip;
        }

        private void SeedSnapshot(SaoKimDBContext db, int id, int productId, DateTime snapshotAtUtc, decimal onHand)
        {
            db.InventoryStockSnapshots.Add(new InventoryStockSnapshot
            {
                Id = id,
                ProductId = productId,
                SnapshotAt = DateTime.SpecifyKind(snapshotAtUtc, DateTimeKind.Utc),
                OnHand = onHand,
                RefType = "test",
                RefId = 1,
                CreatedAt = DateTime.UtcNow
            });
            db.SaveChanges();
        }

        #endregion

        #region Inbound report

        [Fact]
        public async Task GetInboundReportAsync_Returns_Only_Confirmed_And_NotDeleted()
        {
            using var db = CreateDbContext();
            SeedProduct(db, 1, "P001", "P1");

            SeedReceivingSlip(db, 1, "S1", DateTime.UtcNow.AddDays(-1), ReceivingSlipStatus.Draft, false, null, (1, 1, 10));
            SeedReceivingSlip(db, 2, "S2", DateTime.UtcNow.AddDays(-1), ReceivingSlipStatus.Confirmed, true, null, (1, 1, 10));
            SeedReceivingSlip(db, 3, "S3", DateTime.UtcNow.AddDays(-1), ReceivingSlipStatus.Confirmed, false, null, (1, 2, 10));

            var svc = CreateService(db);

            var res = await svc.GetInboundReportAsync(new InboundReportQuery());

            Assert.Single(res);
            Assert.Equal("S3", res[0].Supplier);
            Assert.Equal(1, res[0].TotalItems);
            Assert.Equal(2m, res[0].TotalQuantity);
            Assert.Equal(20m, res[0].TotalValue);
        }

        [Fact]
        public async Task GetInboundReportAsync_Filters_By_Date_Range_LocalDates()
        {
            using var db = CreateDbContext();
            SeedProduct(db, 1, "P001", "P1");

            var todayLocal = DateTime.Now.Date;
            var inRangeUtc = DateTime.SpecifyKind(todayLocal.AddHours(2), DateTimeKind.Local).ToUniversalTime();
            var outRangeUtc = DateTime.SpecifyKind(todayLocal.AddDays(-2).AddHours(2), DateTimeKind.Local).ToUniversalTime();

            SeedReceivingSlip(db, 1, "S1", inRangeUtc, ReceivingSlipStatus.Confirmed, false, null, (1, 1, 10));
            SeedReceivingSlip(db, 2, "S2", outRangeUtc, ReceivingSlipStatus.Confirmed, false, null, (1, 1, 10));

            var svc = CreateService(db);

            var res = await svc.GetInboundReportAsync(new InboundReportQuery
            {
                FromDate = todayLocal,
                ToDate = todayLocal
            });

            Assert.Single(res);
            Assert.Equal("S1", res[0].Supplier);
        }

        #endregion

        #region Outbound report

        [Fact]
        public async Task GetOutboundReportAsync_Returns_Only_Confirmed_And_NotDeleted()
        {
            using var db = CreateDbContext();
            SeedProduct(db, 1, "P001", "P1");

            SeedRetailDispatch(db, 1, "ORD-1", "C1", DateTime.UtcNow, DispatchStatus.Draft, false, null, (1, 1, 10));
            SeedRetailDispatch(db, 2, "ORD-2", "C2", DateTime.UtcNow, DispatchStatus.Confirmed, true, null, (1, 1, 10));
            SeedRetailDispatch(db, 3, "ORD-3", "C3", DateTime.UtcNow, DispatchStatus.Confirmed, false, null, (1, 2, 10));

            var svc = CreateService(db);

            var res = await svc.GetOutboundReportAsync(new OutboundReportQuery());

            Assert.Single(res);
            Assert.Equal("ORD-3", res[0].ReferenceNo);
            Assert.Equal(1, res[0].TotalItems);
            Assert.Equal(2, res[0].TotalQuantity);
            Assert.Equal(20m, res[0].TotalValue);
        }

        [Fact]
        public async Task GetOutboundReportAsync_Filters_By_Date_Range_LocalDates()
        {
            using var db = CreateDbContext();
            SeedProduct(db, 1, "P001", "P1");

            var todayLocal = DateTime.Now.Date;
            var inRangeUtc = DateTime.SpecifyKind(todayLocal.AddHours(3), DateTimeKind.Local).ToUniversalTime();
            var outRangeUtc = DateTime.SpecifyKind(todayLocal.AddDays(-3).AddHours(3), DateTimeKind.Local).ToUniversalTime();

            SeedRetailDispatch(db, 1, "ORD-1", "C1", inRangeUtc, DispatchStatus.Confirmed, false, null, (1, 1, 10));
            SeedRetailDispatch(db, 2, "ORD-2", "C2", outRangeUtc, DispatchStatus.Confirmed, false, null, (1, 1, 10));

            var svc = CreateService(db);

            var res = await svc.GetOutboundReportAsync(new OutboundReportQuery
            {
                FromDate = todayLocal,
                ToDate = todayLocal
            });

            Assert.Single(res);
            Assert.Equal("ORD-1", res[0].ReferenceNo);
        }

        #endregion

        #region Total stock

        [Fact]
        public async Task GetTotalStockAsync_When_Has_Snapshots_Sums_Latest_Per_Product()
        {
            using var db = CreateDbContext();
            SeedProduct(db, 1, "P001", "P1");
            SeedProduct(db, 2, "P002", "P2");

            SeedProductDetail(db, 1, id: 1, status: "Active", qty: 999);
            SeedProductDetail(db, 2, id: 2, status: "Active", qty: 999);

            SeedSnapshot(db, id: 1, productId: 1, snapshotAtUtc: DateTime.UtcNow.AddDays(-2), onHand: 5);
            SeedSnapshot(db, id: 2, productId: 1, snapshotAtUtc: DateTime.UtcNow.AddDays(-1), onHand: 9);
            SeedSnapshot(db, id: 3, productId: 2, snapshotAtUtc: DateTime.UtcNow.AddDays(-1), onHand: 3);

            var svc = CreateService(db);

            var res = await svc.GetTotalStockAsync();

            Assert.Equal(12m, res.TotalStock);
        }

        #endregion

        #region Inventory list

        [Fact]
        public async Task GetInventoryAsync_Uses_Latest_ActiveOrNull_Detail_By_MaxId()
        {
            using var db = CreateDbContext();
            SeedProduct(db, 1, "P001", "P1");

            SeedProductDetail(db, productId: 1, id: 1, status: "Active", qty: 5, unit: "pcs");
            SeedProductDetail(db, productId: 1, id: 2, status: "Inactive", qty: 999, unit: "kg");
            SeedProductDetail(db, productId: 1, id: 3, status: "Active", qty: 7, unit: "box");

            var svc = CreateService(db);

            var res = await svc.GetInventoryAsync(new InventoryListQuery { Page = 1, PageSize = 10 });

            var item = Assert.Single(res.Items);

            Assert.Equal(1, item.ProductId);
            Assert.Equal(7m, item.OnHand);
            Assert.Equal("box", item.UomName);
        }

        #endregion

        #region Inventory report

        [Fact]
        public async Task GetInventoryReportAsync_Throws_When_ToDate_Less_Than_FromDate()
        {
            using var db = CreateDbContext();
            var svc = CreateService(db);

            var from = new DateTime(2025, 1, 10);
            var to = new DateTime(2025, 1, 1);

            await Assert.ThrowsAsync<ArgumentException>(() =>
                svc.GetInventoryReportAsync(new InventoryListQuery
                {
                    DateFrom = from,
                    DateTo = to,
                    Page = 1,
                    PageSize = 10
                }));
        }

        [Fact]
        public async Task GetInventoryReportAsync_Status_Computed_Critical_Alert_Stock()
        {
            using var db = CreateDbContext();

            SeedProduct(db, 1, "P001", "P1");
            SeedProductDetail(db, 1, 1, "Active", 1, "pcs");
            db.InventoryThresholds.Add(new InventoryThreshold { ProductId = 1, MinStock = 5, UpdatedAt = DateTime.UtcNow });

            SeedProduct(db, 2, "P002", "P2");
            SeedProductDetail(db, 2, 2, "Active", 1, "pcs");
            db.InventoryThresholds.Add(new InventoryThreshold { ProductId = 2, MinStock = 10, UpdatedAt = DateTime.UtcNow });

            SeedProduct(db, 3, "P003", "P3");
            SeedProductDetail(db, 3, 3, "Active", 1, "pcs");
            db.InventoryThresholds.Add(new InventoryThreshold { ProductId = 3, MinStock = 3, UpdatedAt = DateTime.UtcNow });

            db.SaveChanges();

            var fromLocal = DateTime.Now.Date.AddDays(-6);
            var toLocal = DateTime.Now.Date;

            SeedSnapshot(db, 10, 1, DateTime.UtcNow.AddDays(-1), 0);
            SeedSnapshot(db, 11, 2, DateTime.UtcNow.AddDays(-1), 2);
            SeedSnapshot(db, 12, 3, DateTime.UtcNow.AddDays(-1), 5);

            var svc = CreateService(db);

            var res = await svc.GetInventoryReportAsync(new InventoryListQuery
            {
                DateFrom = fromLocal,
                DateTo = toLocal,
                Page = 1,
                PageSize = 50,
                Status = "all"
            });

            var map = res.Items.ToDictionary(x => x.ProductId, x => x.Status);

            Assert.Equal("critical", map[1]);
            Assert.Equal("alert", map[2]);
            Assert.Equal("stock", map[3]);
        }

        [Fact]
        public async Task GetInventoryReportAsync_Filters_By_Status_After_Computation()
        {
            using var db = CreateDbContext();

            SeedProduct(db, 1, "P001", "P1");
            SeedProductDetail(db, 1, 1, "Active", 1, "pcs");
            db.InventoryThresholds.Add(new InventoryThreshold { ProductId = 1, MinStock = 5, UpdatedAt = DateTime.UtcNow });
            db.SaveChanges();

            SeedSnapshot(db, 1, 1, DateTime.UtcNow.AddDays(-1), 0);

            var svc = CreateService(db);

            var res = await svc.GetInventoryReportAsync(new InventoryListQuery
            {
                Page = 1,
                PageSize = 50,
                Status = "critical"
            });

            var item = Assert.Single(res.Items);
            Assert.Equal("critical", item.Status);
        }

        #endregion

        #region UpdateMinStock

        [Fact]
        public async Task UpdateMinStockAsync_Throws_When_MinStock_Negative()
        {
            using var db = CreateDbContext();
            var svc = CreateService(db);

            await Assert.ThrowsAsync<ArgumentException>(() => svc.UpdateMinStockAsync(productId: 1, minStock: -1));
        }

        [Fact]
        public async Task UpdateMinStockAsync_Throws_When_Product_Not_Exists()
        {
            using var db = CreateDbContext();
            var svc = CreateService(db);

            await Assert.ThrowsAsync<KeyNotFoundException>(() => svc.UpdateMinStockAsync(productId: 999, minStock: 5));
        }

        [Fact]
        public async Task UpdateMinStockAsync_Creates_New_Threshold_When_Not_Exists()
        {
            using var db = CreateDbContext();
            SeedProduct(db, 1, "P001", "P1");
            var svc = CreateService(db);

            var th = await svc.UpdateMinStockAsync(1, 12);

            Assert.NotNull(th);
            Assert.Equal(1, th.ProductId);
            Assert.Equal(12, th.MinStock);

            var inDb = await db.InventoryThresholds.FirstOrDefaultAsync(x => x.ProductId == 1);
            Assert.NotNull(inDb);
            Assert.Equal(12, inDb!.MinStock);
        }

        #endregion

        #region Trace

        [Fact]
        public async Task SearchTraceAsync_Timeline_Is_Ordered_By_OccurredAt_Asc()
        {
            using var db = CreateDbContext();
            var p1 = SeedProduct(db, 1, "SKU-AAA", "Lamp A");

            var identity = new TraceIdentity
            {
                Id = 1,
                IdentityCode = "SERIAL-111",
                ProductId = p1.ProductID,
                Product = p1,
                Status = "Active",
                UpdatedAt = DateTime.UtcNow
            };

            identity.Events = new List<TraceEvent>
            {
                new TraceEvent { Id = 1, TraceIdentityId = 1, EventType = "b", OccurredAt = DateTime.UtcNow.AddMinutes(2), RefCode = "R2" },
                new TraceEvent { Id = 2, TraceIdentityId = 1, EventType = "a", OccurredAt = DateTime.UtcNow.AddMinutes(1), RefCode = "R1" }
            };

            db.TraceIdentities.Add(identity);
            db.SaveChanges();

            var svc = CreateService(db);

            var res = await svc.SearchTraceAsync(new TraceSearchQuery { Query = "SERIAL" });

            Assert.Single(res);
            var t = res[0].Timeline.ToList();
            Assert.Equal(2, t.Count);
            Assert.True(t[0].Time <= t[1].Time);
            Assert.Equal("R1", t[0].Ref);
            Assert.Equal("R2", t[1].Ref);
        }

        [Fact]
        public async Task GetProductTraceAsync_Returns_Null_When_Product_Not_Found()
        {
            using var db = CreateDbContext();
            var svc = CreateService(db);

            var res = await svc.GetProductTraceAsync(999);

            Assert.Null(res);
        }

        [Fact]
        public async Task GetProductTraceAsync_Returns_Movements_In_And_Out_Sorted_By_Date()
        {
            using var db = CreateDbContext();
            var p1 = SeedProduct(db, 1, "SKU-AAA", "Lamp A");
            SeedProductDetail(db, 1, id: 1, status: "Active", qty: 1, unit: "pcs");

            var t1 = DateTime.UtcNow.AddDays(-3);
            var t2 = DateTime.UtcNow.AddDays(-2);
            var t3 = DateTime.UtcNow.AddDays(-1);

            SeedReceivingSlip(db, 1, "SUP-1", t1, ReceivingSlipStatus.Confirmed, false, "note", (1, 5, 10));
            SeedRetailDispatch(db, 10, "ORD-10", "Alice", t2, DispatchStatus.Confirmed, false, "sale", (1, 2, 10));
            SeedProjectDispatch(db, 11, "DSP-PRJ-11", "PJ1", t3, DispatchStatus.Confirmed, false, "proj", (1, 1, 10));

            var svc = CreateService(db);

            var res = await svc.GetProductTraceAsync(1);

            Assert.NotNull(res);
            Assert.Equal(1, res!.ProductId);
            Assert.Equal("SKU-AAA", res.ProductCode);
            Assert.Equal("Lamp A", res.ProductName);

            var mv = res.Movements.ToList();
            Assert.Equal(3, mv.Count);

            Assert.Equal("in", mv[0].Direction);
            Assert.Equal("receiving", mv[0].SlipType);

            Assert.Equal("out", mv[1].Direction);
            Assert.Equal("sales", mv[1].SlipType);

            Assert.Equal("out", mv[2].Direction);
            Assert.Equal("project", mv[2].SlipType);

            Assert.True(mv[0].Date <= mv[1].Date && mv[1].Date <= mv[2].Date);
        }

        #endregion
    }
}
