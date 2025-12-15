using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class UsersControllerTests
    {
        private static UsersController CreateController(Mock<IUserService> svcMock, string? email = null)
        {
            var controller = new UsersController(svcMock.Object);

            var httpContext = new DefaultHttpContext();
            if (!string.IsNullOrEmpty(email))
            {
                httpContext.User = new ClaimsPrincipal(
                    new ClaimsIdentity(
                        new[] { new Claim(ClaimTypes.Name, email) },
                        "TestAuth"));
            }

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };

            return controller;
        }

        #region GetAll

        [Fact]
        public async Task GetAll_ReturnsOk_WithServiceResult()
        {
            var svc = new Mock<IUserService>(MockBehavior.Strict);

            svc.Setup(s => s.GetAllAsync(null, null, null, 1, 20))
               .ReturnsAsync(new PagedResult<UserListItemDto>
               {
                   Items = new List<UserListItemDto>(),
                   TotalItems = 0,
                   Page = 1,
                   PageSize = 20
               });

            var controller = CreateController(svc);

            var result = await controller.GetAll(null, null, null, 1, 20);

            var ok = Assert.IsType<OkObjectResult>(result);

            var value = Assert.IsType<PagedResult<UserListItemDto>>(ok.Value);
            Assert.NotNull(value.Items);
            Assert.Empty(value.Items);
            Assert.Equal(0, value.TotalItems);
            Assert.Equal(1, value.Page);
            Assert.Equal(20, value.PageSize);

            svc.Verify(s => s.GetAllAsync(null, null, null, 1, 20), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        #endregion

        #region GetProjectManagers

        [Fact]
        public async Task GetProjectManagers_ReturnsOk_WithList()
        {
            var svc = new Mock<IUserService>(MockBehavior.Strict);

            var pms = new List<ProjectManagerOptionDTO>
{
    new ProjectManagerOptionDTO
    {
        Name = "PM1",
        Email = "pm1@x.com"
    }
};

            svc.Setup(s => s.GetProjectManagersAsync())
               .Returns(Task.FromResult<IReadOnlyList<ProjectManagerOptionDTO>>(pms));


            var controller = CreateController(svc);

            var result = await controller.GetProjectManagers();

            var ok = Assert.IsType<OkObjectResult>(result);
            var list = Assert.IsAssignableFrom<IReadOnlyList<ProjectManagerOptionDTO>>(ok.Value);
            Assert.Single(list);
            Assert.Equal("PM1", list[0].Name);

            svc.Verify(s => s.GetProjectManagersAsync(), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        #endregion

        #region GetById

        [Fact]
        public async Task GetById_ReturnsNotFound_WhenNull()
        {
            var svc = new Mock<IUserService>(MockBehavior.Strict);

            svc.Setup(s => s.GetByIdAsync(1))
               .Returns(Task.FromResult<UserDetailDto?>(null));

            var controller = CreateController(svc);

            var result = await controller.GetById(1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var msg = nf.Value?.GetType().GetProperty("message")?.GetValue(nf.Value)?.ToString();
            Assert.Equal("Không tìm thấy người dùng", msg);

            svc.Verify(s => s.GetByIdAsync(1), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task GetById_ReturnsOk_WhenFound()
        {
            var svc = new Mock<IUserService>(MockBehavior.Strict);

            var dto = new UserDetailDto(); // nếu có field bắt buộc thì set thêm

            svc.Setup(s => s.GetByIdAsync(1))
               .Returns(Task.FromResult<UserDetailDto?>(dto));

            var controller = CreateController(svc);

            var result = await controller.GetById(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Same(dto, ok.Value);

            svc.Verify(s => s.GetByIdAsync(1), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        #endregion

        #region UpdateUser

        [Fact]
        public async Task UpdateUser_ReturnsNotFound_WhenServiceReturnsFalse()
        {
            var svc = new Mock<IUserService>(MockBehavior.Strict);

            svc.Setup(s => s.UpdateUserAsync(1, It.IsAny<UserUpdateDto>()))
               .Returns(Task.FromResult(false));

            var controller = CreateController(svc);

            var result = await controller.UpdateUser(1, new UserUpdateDto());

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var msg = nf.Value?.GetType().GetProperty("message")?.GetValue(nf.Value)?.ToString();
            Assert.Equal("Không tìm thấy người dùng", msg);

            svc.Verify(s => s.UpdateUserAsync(1, It.IsAny<UserUpdateDto>()), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task UpdateUser_ReturnsOk_WhenServiceReturnsTrue()
        {
            var svc = new Mock<IUserService>(MockBehavior.Strict);

            svc.Setup(s => s.UpdateUserAsync(1, It.IsAny<UserUpdateDto>()))
               .Returns(Task.FromResult(true));

            var controller = CreateController(svc);

            var result = await controller.UpdateUser(1, new UserUpdateDto());

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();
            Assert.Equal("User updated", msg);

            svc.Verify(s => s.UpdateUserAsync(1, It.IsAny<UserUpdateDto>()), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        #endregion

        #region GetRoles

        [Fact]
        public async Task GetRoles_ReturnsOk_WithRoles()
        {
            var svc = new Mock<IUserService>(MockBehavior.Strict);

            IReadOnlyList<RoleItemDto> roles = new List<RoleItemDto>
    {
        new RoleItemDto { Id = 2, Name = "admin" },
        new RoleItemDto { Id = 1, Name = "staff" }
    };

            svc.Setup(s => s.GetRolesAsync())
               .Returns(Task.FromResult(roles));

            var controller = CreateController(svc);

            var result = await controller.GetRoles();

            var ok = Assert.IsType<OkObjectResult>(result);
            var value = Assert.IsAssignableFrom<IReadOnlyList<RoleItemDto>>(ok.Value);

            Assert.Equal(2, value.Count);

            svc.Verify(s => s.GetRolesAsync(), Times.Once);
            svc.VerifyNoOtherCalls();
        }


        #endregion

        #region GetMe

        [Fact]
        public async Task GetMe_ReturnsUnauthorized_WhenNoIdentity()
        {
            var svc = new Mock<IUserService>(MockBehavior.Strict);
            var controller = CreateController(svc, email: null);

            var result = await controller.GetMe();

            var un = Assert.IsType<UnauthorizedObjectResult>(result);
            var msg = un.Value?.GetType().GetProperty("message")?.GetValue(un.Value)?.ToString();
            Assert.Equal("Chưa đăng nhập", msg);

            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task GetMe_ReturnsNotFound_WhenServiceReturnsNull()
        {
            var svc = new Mock<IUserService>(MockBehavior.Strict);

            svc.Setup(s => s.GetMeAsync("u1@x.com"))
               .Returns(Task.FromResult<UserDetailDto?>(null));

            var controller = CreateController(svc, email: "u1@x.com");

            var result = await controller.GetMe();

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var msg = nf.Value?.GetType().GetProperty("message")?.GetValue(nf.Value)?.ToString();
            Assert.Equal("Không tìm thấy người dùng", msg);

            svc.Verify(s => s.GetMeAsync("u1@x.com"), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task GetMe_ReturnsOk_WhenFound()
        {
            var svc = new Mock<IUserService>(MockBehavior.Strict);

            var dto = new UserDetailDto(); 

            svc.Setup(s => s.GetMeAsync("u1@x.com"))
               .Returns(Task.FromResult<UserDetailDto?>(dto));

            var controller = CreateController(svc, email: "u1@x.com");

            var result = await controller.GetMe();

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Same(dto, ok.Value);

            svc.Verify(s => s.GetMeAsync("u1@x.com"), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        #endregion

        #region UpdateMe

        [Fact]
        public async Task UpdateMe_ReturnsUnauthorized_WhenNoIdentity()
        {
            var svc = new Mock<IUserService>(MockBehavior.Strict);
            var controller = CreateController(svc, email: null);

            var result = await controller.UpdateMe(new UpdateProfileDto());

            var un = Assert.IsType<UnauthorizedObjectResult>(result);
            var msg = un.Value?.GetType().GetProperty("message")?.GetValue(un.Value)?.ToString();
            Assert.Equal("Chưa đăng nhập", msg);

            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task UpdateMe_ReturnsNotFound_WhenServiceReturnsFalse()
        {
            var svc = new Mock<IUserService>(MockBehavior.Strict);

            svc.Setup(s => s.UpdateMeAsync("u1@x.com", It.IsAny<UpdateProfileDto>(), It.IsAny<string>()))
               .Returns(Task.FromResult(false));

            var controller = CreateController(svc, email: "u1@x.com");

            var result = await controller.UpdateMe(new UpdateProfileDto());

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var msg = nf.Value?.GetType().GetProperty("message")?.GetValue(nf.Value)?.ToString();
            Assert.Equal("Không tìm thấy người dùng", msg);

            svc.Verify(s => s.UpdateMeAsync("u1@x.com", It.IsAny<UpdateProfileDto>(), It.IsAny<string>()), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task UpdateMe_ReturnsOk_WhenServiceReturnsTrue()
        {
            var svc = new Mock<IUserService>(MockBehavior.Strict);

            svc.Setup(s => s.UpdateMeAsync("u1@x.com", It.IsAny<UpdateProfileDto>(), It.IsAny<string>()))
               .Returns(Task.FromResult(true));

            var controller = CreateController(svc, email: "u1@x.com");

            var result = await controller.UpdateMe(new UpdateProfileDto());

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();
            Assert.Equal("Profile updated successfully", msg);

            svc.Verify(s => s.UpdateMeAsync("u1@x.com", It.IsAny<UpdateProfileDto>(), It.IsAny<string>()), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        #endregion
    }
}
