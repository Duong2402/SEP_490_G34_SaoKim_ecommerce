using Microsoft.AspNetCore.Mvc;
using Moq;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Services;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class ManagerReportsControllerTests
    {
        private static ManagerReportsController CreateController(Mock<IManagerReportsService> svcMock)
            => new ManagerReportsController(svcMock.Object);

        #region GetOverview

        [Fact]
        public async Task GetOverview_ReturnsOk_WithManagerOverviewDto()
        {
            var svc = new Mock<IManagerReportsService>(MockBehavior.Strict);

            var dto = new ManagerOverviewDto(); // set field bắt buộc nếu có

            svc.Setup(s => s.GetOverviewAsync())
               .Returns(Task.FromResult(dto));

            var controller = CreateController(svc);

            var result = await controller.GetOverview();

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Same(dto, ok.Value);

            svc.Verify(s => s.GetOverviewAsync(), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        #endregion

        #region GetRevenueByDay

        [Fact]
        public async Task GetRevenueByDay_DefaultDays_ReturnsOk_List()
        {
            var svc = new Mock<IManagerReportsService>(MockBehavior.Strict);

            var list = new List<RevenueByDayItemDto>();
            const int defaultDays = 7;

            svc.Setup(s => s.GetRevenueByDayAsync(defaultDays))
               .Returns(Task.FromResult<IReadOnlyList<RevenueByDayItemDto>>(list));

            var controller = CreateController(svc);

            var result = await controller.GetRevenueByDay();

            var ok = Assert.IsType<OkObjectResult>(result);
            var value = Assert.IsAssignableFrom<IReadOnlyList<RevenueByDayItemDto>>(ok.Value);

            Assert.Same(list, value);

            svc.Verify(s => s.GetRevenueByDayAsync(defaultDays), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task GetRevenueByDay_WithDays_PassesDaysToService()
        {
            var svc = new Mock<IManagerReportsService>(MockBehavior.Strict);

            var list = new List<RevenueByDayItemDto>
            {
                new RevenueByDayItemDto()
            };

            svc.Setup(s => s.GetRevenueByDayAsync(7))
               .Returns(Task.FromResult<IReadOnlyList<RevenueByDayItemDto>>(list));

            var controller = CreateController(svc);

            var result = await controller.GetRevenueByDay(7);

            var ok = Assert.IsType<OkObjectResult>(result);
            var value = Assert.IsAssignableFrom<IReadOnlyList<RevenueByDayItemDto>>(ok.Value);

            Assert.Single(value);

            svc.Verify(s => s.GetRevenueByDayAsync(7), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        #endregion
    }
}
