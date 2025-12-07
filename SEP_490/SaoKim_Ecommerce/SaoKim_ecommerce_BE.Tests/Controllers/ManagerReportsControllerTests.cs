using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class ManagerReportsControllerTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new SaoKimDBContext(options);
        }

        private ManagerReportsController CreateController(SaoKimDBContext db)
        {
            return new ManagerReportsController(db);
        }

        #region GetOverview

        [Fact]
        public async Task GetOverview_ReturnsOk_WithManagerOverviewDto()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var result = await controller.GetOverview();

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.IsType<ManagerOverviewDto>(ok.Value);
        }

        [Fact]
        public async Task GetOverview_ComputesRevenueAndRevenue7d_OnlyCompletedOrders()
        {
            using var db = CreateDbContext();
            var today = DateTime.UtcNow.Date;
            var sevenDaysAgo = today.AddDays(-6);

            db.Orders.Add(new Order
            {
                Status = "Completed",
                Total = 100m,
                CreatedAt = today
            });
            db.Orders.Add(new Order
            {
                Status = "Completed",
                Total = 200m,
                CreatedAt = sevenDaysAgo.AddDays(1)
            });

            db.Orders.Add(new Order
            {
                Status = "Completed",
                Total = 500m,
                CreatedAt = sevenDaysAgo.AddDays(-1)
            });

            db.Orders.Add(new Order
            {
                Status = "Pending",
                Total = 999m,
                CreatedAt = today
            });

            await db.SaveChangesAsync();

            var controller = CreateController(db);
            var result = await controller.GetOverview();

            var ok = Assert.IsType<OkObjectResult>(result);
            var dto = Assert.IsType<ManagerOverviewDto>(ok.Value);

            Assert.Equal(100m + 200m + 500m, dto.Revenue.TotalRevenue);

            Assert.Equal(100m + 200m, dto.Revenue.Revenue7d);
        }

        [Fact]
        public async Task GetOverview_ComputesOrdersTodayAndPendingOrders()
        {
            using var db = CreateDbContext();
            var today = DateTime.UtcNow.Date;
            var yesterday = today.AddDays(-1);

            db.Orders.Add(new Order
            {
                Status = "Completed",
                Total = 50m,
                CreatedAt = today
            });
            db.Orders.Add(new Order
            {
                Status = "Pending",
                Total = 60m,
                CreatedAt = today
            });

            db.Orders.Add(new Order
            {
                Status = "Pending",
                Total = 70m,
                CreatedAt = yesterday
            });

            await db.SaveChangesAsync();

            var controller = CreateController(db);
            var result = await controller.GetOverview();

            var ok = Assert.IsType<OkObjectResult>(result);
            var dto = Assert.IsType<ManagerOverviewDto>(ok.Value);

            Assert.Equal(2, dto.Revenue.OrdersToday); 
            Assert.Equal(2, dto.Revenue.PendingOrders); 
        }

        [Fact]
        public async Task GetOverview_ComputesTotalStock()
        {
            using var db = CreateDbContext();

            db.ProductDetails.Add(new ProductDetail { Quantity = 10 });
            db.ProductDetails.Add(new ProductDetail { Quantity = 5 });
            db.ProductDetails.Add(new ProductDetail { Quantity = 0 });

            await db.SaveChangesAsync();

            var controller = CreateController(db);
            var result = await controller.GetOverview();

            var ok = Assert.IsType<OkObjectResult>(result);
            var dto = Assert.IsType<ManagerOverviewDto>(ok.Value);

            Assert.Equal(15, dto.Warehouse.TotalStock);
        }

        [Fact]
        public async Task GetOverview_ComputesInboundAndOutboundThisWeekAndLastWeek()
        {
            using var db = CreateDbContext();
            var today = DateTime.UtcNow.Date;
            var dayOfWeek = (int)today.DayOfWeek;
            var startOfThisWeek = today.AddDays(-dayOfWeek + 1);
            var startOfLastWeek = startOfThisWeek.AddDays(-7);

            db.ReceivingSlips.Add(new ReceivingSlip
            {
                Status = ReceivingSlipStatus.Confirmed,
                ReceiptDate = startOfThisWeek.AddDays(1)
            });

            db.ReceivingSlips.Add(new ReceivingSlip
            {
                Status = ReceivingSlipStatus.Confirmed,
                ReceiptDate = startOfLastWeek.AddDays(2)
            });

            db.ReceivingSlips.Add(new ReceivingSlip
            {
                Status = ReceivingSlipStatus.Draft,
                ReceiptDate = startOfThisWeek.AddDays(1)
            });

            db.Dispatches.Add(new RetailDispatch
            {
                Status = DispatchStatus.Confirmed,
                DispatchDate = startOfThisWeek.AddDays(3),
                ReferenceNo = "OUT-TW-1",
                CustomerName = "Customer TW"
            });

            db.Dispatches.Add(new RetailDispatch
            {
                Status = DispatchStatus.Confirmed,
                DispatchDate = startOfLastWeek.AddDays(4),
                ReferenceNo = "OUT-LW-1",
                CustomerName = "Customer LW"
            });

            db.Dispatches.Add(new RetailDispatch
            {
                Status = DispatchStatus.Draft,
                DispatchDate = startOfThisWeek.AddDays(3),
                ReferenceNo = "OUT-DRAFT-1",
                CustomerName = "Customer Draft"
            });

            await db.SaveChangesAsync();

            var controller = CreateController(db);
            var result = await controller.GetOverview();

            var ok = Assert.IsType<OkObjectResult>(result);
            var dto = Assert.IsType<ManagerOverviewDto>(ok.Value);

            Assert.Equal(1, dto.Warehouse.Inbound.ThisWeek);
            Assert.Equal(1, dto.Warehouse.Inbound.LastWeek);
            Assert.Equal(1, dto.Warehouse.Outbound.ThisWeek);
            Assert.Equal(1, dto.Warehouse.Outbound.LastWeek);
        }

        [Fact]
        public async Task GetOverview_WhenNoData_AllNumbersAreZero()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var result = await controller.GetOverview();

            var ok = Assert.IsType<OkObjectResult>(result);
            var dto = Assert.IsType<ManagerOverviewDto>(ok.Value);

            Assert.Equal(0m, dto.Revenue.TotalRevenue);
            Assert.Equal(0m, dto.Revenue.Revenue7d);
            Assert.Equal(0, dto.Revenue.OrdersToday);
            Assert.Equal(0, dto.Revenue.PendingOrders);

            Assert.Equal(0, dto.Warehouse.TotalStock);
            Assert.Equal(0, dto.Warehouse.Inbound.ThisWeek);
            Assert.Equal(0, dto.Warehouse.Inbound.LastWeek);
            Assert.Equal(0, dto.Warehouse.Outbound.ThisWeek);
            Assert.Equal(0, dto.Warehouse.Outbound.LastWeek);

            Assert.Equal(0, dto.Projects.TotalProjects);
            Assert.Equal(0, dto.Projects.DraftProjects);
            Assert.Equal(0, dto.Projects.ActiveProjects);
            Assert.Equal(0, dto.Projects.CompletedProjects);
            Assert.Equal(0m, dto.Projects.TotalBudget);
            Assert.Equal(0m, dto.Projects.TotalProductCost);
            Assert.Equal(0m, dto.Projects.TotalOtherExpenses);
            Assert.Equal(0m, dto.Projects.TotalActualCost);
        }

        #endregion

        #region GetRevenueByDay

        private static List<RevenueByDayItemDto> GetRevenueByDayResult(IActionResult result)
        {
            var ok = Assert.IsType<OkObjectResult>(result);
            return Assert.IsType<List<RevenueByDayItemDto>>(ok.Value);
        }

        [Fact]
        public async Task GetRevenueByDay_DefaultDays_Returns7ItemsContinuous()
        {
            using var db = CreateDbContext();
            var today = DateTime.UtcNow.Date;
            var from = today.AddDays(-6);

            // 1 order ở ngày giữa
            db.Orders.Add(new Order
            {
                Status = "Completed",
                Total = 100m,
                CreatedAt = from.AddDays(3)
            });

            await db.SaveChangesAsync();

            var controller = CreateController(db);
            var result = await controller.GetRevenueByDay();

            var list = GetRevenueByDayResult(result);

            Assert.Equal(7, list.Count);
            Assert.Equal(from, list.First().Date);
            Assert.Equal(today, list.Last().Date);
        }

        [Fact]
        public async Task GetRevenueByDay_OnlyCountsCompletedOrders()
        {
            using var db = CreateDbContext();
            var today = DateTime.UtcNow.Date;

            db.Orders.Add(new Order
            {
                Status = "Completed",
                Total = 100m,
                CreatedAt = today
            });
            db.Orders.Add(new Order
            {
                Status = "Pending",
                Total = 999m,
                CreatedAt = today
            });

            await db.SaveChangesAsync();

            var controller = CreateController(db);
            var result = await controller.GetRevenueByDay(1);

            var list = GetRevenueByDayResult(result);
            Assert.Single(list);
            Assert.Equal(today, list[0].Date);
            Assert.Equal(100m, list[0].Revenue);
        }

        [Fact]
        public async Task GetRevenueByDay_GroupsMultipleOrdersSameDay()
        {
            using var db = CreateDbContext();
            var today = DateTime.UtcNow.Date;

            db.Orders.AddRange(
                new Order
                {
                    Status = "Completed",
                    Total = 100m,
                    CreatedAt = today
                },
                new Order
                {
                    Status = "Completed",
                    Total = 50m,
                    CreatedAt = today
                });

            await db.SaveChangesAsync();

            var controller = CreateController(db);
            var result = await controller.GetRevenueByDay(1);

            var list = GetRevenueByDayResult(result);

            Assert.Single(list);
            Assert.Equal(150m, list[0].Revenue);
        }

        [Fact]
        public async Task GetRevenueByDay_FillsMissingDaysWithZero()
        {
            using var db = CreateDbContext();
            var today = DateTime.UtcNow.Date;
            var from = today.AddDays(-2);

            var middleDay = from.AddDays(1);

            db.Orders.Add(new Order
            {
                Status = "Completed",
                Total = 200m,
                CreatedAt = middleDay
            });

            await db.SaveChangesAsync();

            var controller = CreateController(db);
            var result = await controller.GetRevenueByDay(3);

            var list = GetRevenueByDayResult(result);

            Assert.Equal(3, list.Count);
            Assert.Equal(from, list[0].Date);
            Assert.Equal(middleDay, list[1].Date);
            Assert.Equal(today, list[2].Date);

            Assert.Equal(0m, list[0].Revenue);
            Assert.Equal(200m, list[1].Revenue);
            Assert.Equal(0m, list[2].Revenue);
        }

        [Fact]
        public async Task GetRevenueByDay_NoOrders_AllZero()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var result = await controller.GetRevenueByDay(5);

            var list = GetRevenueByDayResult(result);

            Assert.Equal(5, list.Count);
            Assert.All(list, item => Assert.Equal(0m, item.Revenue));
        }

        [Fact]
        public async Task GetRevenueByDay_InvalidDaysLessOrEqualZero_ResetsTo7()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var result = await controller.GetRevenueByDay(0);

            var list = GetRevenueByDayResult(result);
            Assert.Equal(7, list.Count);
        }

        [Fact]
        public async Task GetRevenueByDay_InvalidDaysGreaterThan90_ResetsTo7()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var result = await controller.GetRevenueByDay(365);

            var list = GetRevenueByDayResult(result);
            Assert.Equal(7, list.Count);
        }

        #endregion
    }
}
