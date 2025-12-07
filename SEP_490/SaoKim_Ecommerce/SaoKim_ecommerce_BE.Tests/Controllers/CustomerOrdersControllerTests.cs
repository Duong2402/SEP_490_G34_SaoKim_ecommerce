using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class CustomerOrdersControllerTests
    {
        private CustomerOrdersController CreateController(ICustomerOrderService service, int? userId = null)
        {
            var controller = new CustomerOrdersController(service);

            var httpContext = new DefaultHttpContext();

            if (userId.HasValue)
            {
                var identity = new ClaimsIdentity(new[]
                {
                    new Claim("UserId", userId.Value.ToString())
                }, "TestAuth");

                httpContext.User = new ClaimsPrincipal(identity);
            }

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };

            return controller;
        }

        [Fact]
        public async Task GetDetail_Returns_Unauthorized_When_No_UserId_In_Token()
        {
            var mockService = new Mock<ICustomerOrderService>();
            var controller = CreateController(mockService.Object, userId: null);

            var result = await controller.GetDetail(123);

            var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
            var body = unauthorized.Value as IDictionary<string, object>;
            Assert.Equal(StatusCodes.Status401Unauthorized, unauthorized.StatusCode);
        }

        [Fact]
        public async Task GetDetail_Returns_NotFound_When_Service_Returns_Null()
        {
            var mockService = new Mock<ICustomerOrderService>();
            mockService
                .Setup(s => s.GetOrderDetailAsync(123, 1))
                .ReturnsAsync((CustomerOrderDetailDto?)null);

            var controller = CreateController(mockService.Object, userId: 1);

            var result = await controller.GetDetail(123);

            var notFound = Assert.IsType<NotFoundObjectResult>(result);
            Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);

            mockService.Verify(s => s.GetOrderDetailAsync(123, 1), Times.Once);
        }

        [Fact]
        public async Task GetDetail_Returns_Ok_With_Detail_When_Found()
        {
            var mockService = new Mock<ICustomerOrderService>();
            var dto = new CustomerOrderDetailDto
            {
                OrderId = 123,
                Status = "Pending",
                Total = 1000
            };

            mockService
                .Setup(s => s.GetOrderDetailAsync(123, 1))
                .ReturnsAsync(dto);

            var controller = CreateController(mockService.Object, userId: 1);

            var result = await controller.GetDetail(123);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);

            var returned = Assert.IsType<CustomerOrderDetailDto>(ok.Value);
            Assert.Equal(123, returned.OrderId);
            Assert.Equal("Pending", returned.Status);

            mockService.Verify(s => s.GetOrderDetailAsync(123, 1), Times.Once);
        }
    }
}
