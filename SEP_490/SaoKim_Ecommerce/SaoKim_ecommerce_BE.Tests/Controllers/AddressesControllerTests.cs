using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models.Requests;
using SaoKim_ecommerce_BE.Services;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class AddressesControllerTests
    {
        private static AddressesController CreateController(
            Mock<IAddressesService> serviceMock,
            int? userId = 1)
        {
            var controller = new AddressesController(serviceMock.Object);

            var httpContext = new DefaultHttpContext();
            if (userId.HasValue)
            {
                httpContext.User = new ClaimsPrincipal(
                    new ClaimsIdentity(
                        new[] { new Claim("UserId", userId.Value.ToString()) },
                        "TestAuth"));
            }

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };

            return controller;
        }

        private static CreateAddressRequest MakeCreateRequest(bool isDefault = false, double? lat = null, double? lng = null)
            => new CreateAddressRequest
            {
                RecipientName = "Name",
                PhoneNumber = "0123456789",
                Line1 = "Line 1",
                Ward = "Ward",
                District = "District",
                Province = "Province",
                IsDefault = isDefault,
                Latitude = lat,
                Longitude = lng
            };

        private static AddressUpdateRequest MakeUpdateRequest(bool isDefault = false, double? lat = null, double? lng = null)
            => new AddressUpdateRequest
            {
                RecipientName = "New Name",
                PhoneNumber = "0999999999",
                Line1 = "New Line 1",
                Ward = "New Ward",
                District = "New District",
                Province = "New Province",
                IsDefault = isDefault,
                Latitude = lat,
                Longitude = lng
            };

        [Fact]
        public async Task GetMine_ReturnsUnauthorized_WhenUserIdMissing()
        {
            var service = new Mock<IAddressesService>(MockBehavior.Strict);
            var controller = CreateController(service, userId: null);

            var result = await controller.GetMine();

            Assert.IsType<UnauthorizedResult>(result);
            service.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task GetMine_ReturnsOk_WithListFromService()
        {
            var service = new Mock<IAddressesService>(MockBehavior.Strict);

            var expected = new List<AddressResponse>
            {
                new AddressResponse { Line1 = "A" },
                new AddressResponse { Line1 = "B" }
            };

            service.Setup(s => s.GetMineAsync(1))
                   .ReturnsAsync(expected);

            var controller = CreateController(service, userId: 1);

            var result = await controller.GetMine();

            var ok = Assert.IsType<OkObjectResult>(result);
            var list = Assert.IsType<List<AddressResponse>>(ok.Value);
            Assert.Equal(2, list.Count);
            Assert.Equal(new[] { "A", "B" }, list.Select(x => x.Line1).ToArray());

            service.Verify(s => s.GetMineAsync(1), Times.Once);
            service.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task Create_ReturnsUnauthorized_WhenUserIdMissing()
        {
            var service = new Mock<IAddressesService>(MockBehavior.Strict);
            var controller = CreateController(service, userId: null);

            var result = await controller.Create(MakeCreateRequest());

            Assert.IsType<UnauthorizedResult>(result);
            service.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task Create_ReturnsOk_AndCallsService()
        {
            var service = new Mock<IAddressesService>(MockBehavior.Strict);

            var req = MakeCreateRequest(isDefault: true);
            var serviceReturn = new AddressResponse
            {
                RecipientName = "Name",
                IsDefault = true,
                Line1 = "Line 1"
            };

            service.Setup(s => s.CreateAsync(1, It.IsAny<CreateAddressRequest>()))
          .Returns(Task.FromResult(serviceReturn));

            var controller = CreateController(service, userId: 1);

            var result = await controller.Create(req);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Same(serviceReturn, ok.Value);

            service.Verify(s => s.CreateAsync(1, It.Is<CreateAddressRequest>(r => r.RecipientName == "Name" && r.IsDefault)), Times.Once);
            service.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task Update_ReturnsUnauthorized_WhenUserIdMissing()
        {
            var service = new Mock<IAddressesService>(MockBehavior.Strict);
            var controller = CreateController(service, userId: null);

            var result = await controller.Update(10, MakeUpdateRequest());

            Assert.IsType<UnauthorizedResult>(result);
            service.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task Update_ReturnsNotFound_WhenServiceThrowsKeyNotFound()
        {
            var service = new Mock<IAddressesService>(MockBehavior.Strict);

            service.Setup(s => s.UpdateAsync(1, 10, It.IsAny<AddressUpdateRequest>()))
                   .ThrowsAsync(new KeyNotFoundException());

            var controller = CreateController(service, userId: 1);

            var result = await controller.Update(10, MakeUpdateRequest());

            Assert.IsType<NotFoundResult>(result);

            service.Verify(s => s.UpdateAsync(1, 10, It.IsAny<AddressUpdateRequest>()), Times.Once);
            service.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task Update_ReturnsOk_WhenServiceSucceeds()
        {
            var service = new Mock<IAddressesService>(MockBehavior.Strict);

            service.Setup(s => s.UpdateAsync(1, 10, It.IsAny<AddressUpdateRequest>()))
                   .Returns(Task.CompletedTask);

            var controller = CreateController(service, userId: 1);

            var result = await controller.Update(10, MakeUpdateRequest());

            Assert.IsType<OkResult>(result);

            service.Verify(s => s.UpdateAsync(1, 10, It.IsAny<AddressUpdateRequest>()), Times.Once);
            service.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task SetDefault_ReturnsUnauthorized_WhenUserIdMissing()
        {
            var service = new Mock<IAddressesService>(MockBehavior.Strict);
            var controller = CreateController(service, userId: null);

            var result = await controller.SetDefault(10);

            Assert.IsType<UnauthorizedResult>(result);
            service.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task SetDefault_ReturnsNotFound_WhenServiceThrowsKeyNotFound()
        {
            var service = new Mock<IAddressesService>(MockBehavior.Strict);

            service.Setup(s => s.SetDefaultAsync(1, 10))
                   .ThrowsAsync(new KeyNotFoundException());

            var controller = CreateController(service, userId: 1);

            var result = await controller.SetDefault(10);

            Assert.IsType<NotFoundResult>(result);

            service.Verify(s => s.SetDefaultAsync(1, 10), Times.Once);
            service.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task SetDefault_ReturnsOk_WhenServiceSucceeds()
        {
            var service = new Mock<IAddressesService>(MockBehavior.Strict);

            service.Setup(s => s.SetDefaultAsync(1, 10))
                   .Returns(Task.CompletedTask);

            var controller = CreateController(service, userId: 1);

            var result = await controller.SetDefault(10);

            Assert.IsType<OkResult>(result);

            service.Verify(s => s.SetDefaultAsync(1, 10), Times.Once);
            service.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task Delete_ReturnsUnauthorized_WhenUserIdMissing()
        {
            var service = new Mock<IAddressesService>(MockBehavior.Strict);
            var controller = CreateController(service, userId: null);

            var result = await controller.Delete(10);

            Assert.IsType<UnauthorizedResult>(result);
            service.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task Delete_ReturnsNotFound_WhenServiceThrowsKeyNotFound()
        {
            var service = new Mock<IAddressesService>(MockBehavior.Strict);

            service.Setup(s => s.DeleteAsync(1, 10))
                   .ThrowsAsync(new KeyNotFoundException());

            var controller = CreateController(service, userId: 1);

            var result = await controller.Delete(10);

            Assert.IsType<NotFoundResult>(result);

            service.Verify(s => s.DeleteAsync(1, 10), Times.Once);
            service.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task Delete_ReturnsOk_WhenServiceSucceeds()
        {
            var service = new Mock<IAddressesService>(MockBehavior.Strict);

            service.Setup(s => s.DeleteAsync(1, 10))
                   .Returns(Task.CompletedTask);

            var controller = CreateController(service, userId: 1);

            var result = await controller.Delete(10);

            Assert.IsType<OkResult>(result);

            service.Verify(s => s.DeleteAsync(1, 10), Times.Once);
            service.VerifyNoOtherCalls();
        }
    }
}
