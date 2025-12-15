using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class ManagerEmployeesControllerTests
    {
        private static ManagerEmployeesController CreateController(Mock<IManagerEmployeesService> svcMock)
        {
            var controller = new ManagerEmployeesController(svcMock.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };
            return controller;
        }

        #region GetAll

        [Fact]
        public async Task GetAll_ReturnsEmpty_WhenNoEmployees()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);

            svc.Setup(s => s.GetAllAsync(null, null, null, 1, 20))
       .Returns(Task.FromResult((
           items: new List<EmployeeListItemDto>(),
           total: 0
       )));

            var controller = CreateController(svc);

            var result = await controller.GetAll(null, null, null);

            var ok = Assert.IsType<OkObjectResult>(result);
            var anon = ok.Value!;

            var totalProp = anon.GetType().GetProperty("total");
            var total = (int)totalProp!.GetValue(anon)!;
            Assert.Equal(0, total);

            var totalPagesProp = anon.GetType().GetProperty("totalPages");
            var totalPages = (int)totalPagesProp!.GetValue(anon)!;
            Assert.Equal(0, totalPages);

            svc.Verify(s => s.GetAllAsync(null, null, null, 1, 20), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task GetAll_ClampsPageAndPageSize_ToAtLeast1()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);

            svc.Setup(s => s.GetAllAsync(null, null, null, 1, 1))
               .Returns(Task.FromResult((
                   items: new List<EmployeeListItemDto>(),
                   total: 0
               )));

            var controller = CreateController(svc);

            var result = await controller.GetAll(null, null, null, page: -5, pageSize: 0);

            Assert.IsType<OkObjectResult>(result);

            svc.Verify(s => s.GetAllAsync(null, null, null, 1, 1), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task GetAll_ReturnsPagedMeta()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);

            var items = new object[] { new { id = 1 }, new { id = 2 } };
            svc.Setup(s => s.GetAllAsync(null, null, null, 1, 1))
       .Returns(Task.FromResult((
           items: new List<EmployeeListItemDto>(),
           total: 2
       )));

            var controller = CreateController(svc);

            var result = await controller.GetAll(null, null, null, page: 1, pageSize: 1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var anon = ok.Value!;

            var total = (int)anon.GetType().GetProperty("total")!.GetValue(anon)!;
            var pageSizeVal = (int)anon.GetType().GetProperty("pageSize")!.GetValue(anon)!;
            var totalPages = (int)anon.GetType().GetProperty("totalPages")!.GetValue(anon)!;

            Assert.Equal(2, total);
            Assert.Equal(1, pageSizeVal);
            Assert.Equal(2, totalPages);

            svc.Verify(s => s.GetAllAsync(null, null, null, 1, 1), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        #endregion

        #region GetById

        [Fact]
        public async Task GetById_ReturnsNotFound_WhenMissing()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);

            svc.Setup(s => s.GetByIdAsync(1))
               .Returns(Task.FromResult<EmployeeDetailDto?>(null));

            var controller = CreateController(svc);

            var result = await controller.GetById(1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var msg = nf.Value?.GetType().GetProperty("message")?.GetValue(nf.Value)?.ToString();
            Assert.Equal("Không tìm thấy nhân viên", msg);

            svc.Verify(s => s.GetByIdAsync(1), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task GetById_ReturnsOk_WhenExists()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);

            // Nếu project bạn không có EmployeeDetailDto thì đổi sang đúng DTO mà service trả về
            var dto = new EmployeeDetailDto();

            svc.Setup(s => s.GetByIdAsync(1))
               .Returns(Task.FromResult<EmployeeDetailDto?>(dto));

            var controller = CreateController(svc);

            var result = await controller.GetById(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Same(dto, ok.Value);

            svc.Verify(s => s.GetByIdAsync(1), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        #endregion

        #region CreateEmployee

        [Fact]
        public async Task CreateEmployee_ReturnsBadRequest_WhenModelInvalid()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);
            var controller = CreateController(svc);

            controller.ModelState.AddModelError("Name", "Required");

            var dto = new EmployeeCreateDto();

            var result = await controller.CreateEmployee(dto);

            Assert.IsType<BadRequestObjectResult>(result);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task CreateEmployee_ReturnsOk_WithId_WhenSuccess()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);

            svc.Setup(s => s.CreateEmployeeAsync(It.IsAny<EmployeeCreateDto>()))
               .Returns(Task.FromResult(123));

            var controller = CreateController(svc);

            var dto = new EmployeeCreateDto();

            var result = await controller.CreateEmployee(dto);

            var ok = Assert.IsType<OkObjectResult>(result);
            var anon = ok.Value!;

            var msg = anon.GetType().GetProperty("message")?.GetValue(anon)?.ToString();
            var id = (int)anon.GetType().GetProperty("id")!.GetValue(anon)!;

            Assert.Equal("Nhân viên tạo thành công", msg);
            Assert.Equal(123, id);

            svc.Verify(s => s.CreateEmployeeAsync(It.IsAny<EmployeeCreateDto>()), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task CreateEmployee_ReturnsConflict_WhenServiceThrowsInvalidOperation()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);

            svc.Setup(s => s.CreateEmployeeAsync(It.IsAny<EmployeeCreateDto>()))
               .ThrowsAsync(new InvalidOperationException("Email đã tồn tại"));

            var controller = CreateController(svc);

            var result = await controller.CreateEmployee(new EmployeeCreateDto());

            var cf = Assert.IsType<ConflictObjectResult>(result);
            var msg = cf.Value?.GetType().GetProperty("message")?.GetValue(cf.Value)?.ToString();
            Assert.Equal("Email đã tồn tại", msg);

            svc.Verify(s => s.CreateEmployeeAsync(It.IsAny<EmployeeCreateDto>()), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        #endregion

        #region UpdateEmployee

        [Fact]
        public async Task UpdateEmployee_ReturnsBadRequest_WhenModelInvalid()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);
            var controller = CreateController(svc);

            controller.ModelState.AddModelError("Email", "Invalid");

            var result = await controller.UpdateEmployee(1, new EmployeeUpdateDto());

            Assert.IsType<BadRequestObjectResult>(result);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task UpdateEmployee_ReturnsOk_WhenSuccess()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);

            svc.Setup(s => s.UpdateEmployeeAsync(1, It.IsAny<EmployeeUpdateDto>()))
               .Returns(Task.CompletedTask);

            var controller = CreateController(svc);

            var result = await controller.UpdateEmployee(1, new EmployeeUpdateDto());

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();
            Assert.Equal("Nhân viên đã được cập nhật", msg);

            svc.Verify(s => s.UpdateEmployeeAsync(1, It.IsAny<EmployeeUpdateDto>()), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task UpdateEmployee_ReturnsNotFound_WhenServiceThrowsKeyNotFound()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);

            svc.Setup(s => s.UpdateEmployeeAsync(1, It.IsAny<EmployeeUpdateDto>()))
               .ThrowsAsync(new KeyNotFoundException("Không tìm thấy nhân viên"));

            var controller = CreateController(svc);

            var result = await controller.UpdateEmployee(1, new EmployeeUpdateDto());

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var msg = nf.Value?.GetType().GetProperty("message")?.GetValue(nf.Value)?.ToString();
            Assert.Equal("Không tìm thấy nhân viên", msg);

            svc.Verify(s => s.UpdateEmployeeAsync(1, It.IsAny<EmployeeUpdateDto>()), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task UpdateEmployee_ReturnsBadRequest_WhenServiceThrowsInvalidOperation()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);

            svc.Setup(s => s.UpdateEmployeeAsync(1, It.IsAny<EmployeeUpdateDto>()))
               .ThrowsAsync(new InvalidOperationException("Bạn không được phép chỉnh sửa thông tin tài khoản này"));

            var controller = CreateController(svc);

            var result = await controller.UpdateEmployee(1, new EmployeeUpdateDto());

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var msg = br.Value?.GetType().GetProperty("message")?.GetValue(br.Value)?.ToString();
            Assert.Equal("Bạn không được phép chỉnh sửa thông tin tài khoản này", msg);

            svc.Verify(s => s.UpdateEmployeeAsync(1, It.IsAny<EmployeeUpdateDto>()), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        #endregion

        #region DeleteEmployee

        [Fact]
        public async Task DeleteEmployee_ReturnsOk_WhenSuccess()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);

            svc.Setup(s => s.DeleteEmployeeAsync(1))
               .Returns(Task.CompletedTask);

            var controller = CreateController(svc);

            var result = await controller.DeleteEmployee(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();
            Assert.Equal("Nhân viên đã bị xóa", msg);

            svc.Verify(s => s.DeleteEmployeeAsync(1), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task DeleteEmployee_ReturnsNotFound_WhenServiceThrowsKeyNotFound()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);

            svc.Setup(s => s.DeleteEmployeeAsync(1))
               .ThrowsAsync(new KeyNotFoundException("Không tìm thấy nhân viên"));

            var controller = CreateController(svc);

            var result = await controller.DeleteEmployee(1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var msg = nf.Value?.GetType().GetProperty("message")?.GetValue(nf.Value)?.ToString();
            Assert.Equal("Không tìm thấy nhân viên", msg);

            svc.Verify(s => s.DeleteEmployeeAsync(1), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task DeleteEmployee_ReturnsBadRequest_WhenServiceThrowsInvalidOperation()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);

            svc.Setup(s => s.DeleteEmployeeAsync(1))
               .ThrowsAsync(new InvalidOperationException("Bạn không được phép xóa tài khoản này"));

            var controller = CreateController(svc);

            var result = await controller.DeleteEmployee(1);

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var msg = br.Value?.GetType().GetProperty("message")?.GetValue(br.Value)?.ToString();
            Assert.Equal("Bạn không được phép xóa tài khoản này", msg);

            svc.Verify(s => s.DeleteEmployeeAsync(1), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        #endregion

        #region GetRoles

        [Fact]
        public async Task GetRolesForEmployees_ReturnsOk_WithRoles()
        {
            var svc = new Mock<IManagerEmployeesService>(MockBehavior.Strict);

            var roles = new List<RoleItemDto>
    {
        new RoleItemDto { Id = 1, Name = "staff" },
        new RoleItemDto { Id = 2, Name = "manager" }
    };

            svc.Setup(s => s.GetRolesAsync())
               .Returns(Task.FromResult(roles));

            var controller = CreateController(svc);

            var result = await controller.GetRolesForEmployees();

            var ok = Assert.IsType<OkObjectResult>(result);
            var value = Assert.IsType<List<RoleItemDto>>(ok.Value);

            Assert.Equal(2, value.Count);

            svc.Verify(s => s.GetRolesAsync(), Times.Once);
            svc.VerifyNoOtherCalls();
        }


        #endregion
    }
}
