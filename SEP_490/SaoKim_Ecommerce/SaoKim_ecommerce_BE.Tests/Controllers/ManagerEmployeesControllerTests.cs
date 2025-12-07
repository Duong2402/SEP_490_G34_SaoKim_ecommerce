using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using Xunit;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class ManagerEmployeesControllerTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new SaoKimDBContext(options);
        }

        private class FakeEnv : IWebHostEnvironment
        {
            public string ApplicationName { get; set; } = "Tests";
            public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
            public string WebRootPath { get; set; } = Path.Combine(Path.GetTempPath(), "manager-employees-wwwroot");
            public string EnvironmentName { get; set; } = "Development";
            public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
            public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        }

        private ManagerEmployeesController CreateController(SaoKimDBContext db)
        {
            var env = new FakeEnv();
            var controller = new ManagerEmployeesController(db, env);
            return controller;
        }

        private User CreateUser(int id, string email = "u@example.com", string roleName = "staff")
        {
            var role = new Role { RoleId = id + 100, Name = roleName };
            return new User
            {
                UserID = id,
                Name = "User " + id,
                Email = email,
                Password = "hash",
                RoleId = role.RoleId,
                Role = role,
                Status = "Active",
                CreateAt = DateTime.UtcNow
            };
        }

        [Fact]
        public async Task GetAll_ReturnsEmpty_WhenNoEmployees()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var result = await controller.GetAll(null, null, null);

            var ok = Assert.IsType<OkObjectResult>(result);
            var anon = ok.Value!;

            var totalProp = anon.GetType().GetProperty("total");
            Assert.NotNull(totalProp);

            var totalObj = totalProp!.GetValue(anon);
            var total = Assert.IsType<int>(totalObj);

            Assert.Equal(0, total);
        }


        [Fact]
        public async Task GetAll_ReturnsPagedEmployees()
        {
            using var db = CreateDbContext();
            db.Users.Add(CreateUser(1));
            db.Users.Add(CreateUser(2));
            await db.SaveChangesAsync();
            var controller = CreateController(db);

            var result = await controller.GetAll(null, null, null, page: 1, pageSize: 1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var anon = ok.Value!; 

            // total
            var totalProp = anon.GetType().GetProperty("total");
            Assert.NotNull(totalProp);
            var totalObj = totalProp!.GetValue(anon);
            var total = Assert.IsType<int>(totalObj);
            Assert.Equal(2, total);

            var pageSizeProp = anon.GetType().GetProperty("pageSize");
            Assert.NotNull(pageSizeProp);
            var pageSizeObj = pageSizeProp!.GetValue(anon);
            var pageSize = Assert.IsType<int>(pageSizeObj);
            Assert.Equal(1, pageSize);
        }


        [Fact]
        public async Task GetAll_ExcludesDeletedEmployees()
        {
            using var db = CreateDbContext();
            var u1 = CreateUser(1);
            var u2 = CreateUser(2);
            u2.DeletedAt = DateTime.UtcNow;
            db.Users.AddRange(u1, u2);
            await db.SaveChangesAsync();
            var controller = CreateController(db);

            var result = await controller.GetAll(null, null, null);

            var ok = Assert.IsType<OkObjectResult>(result);
            var anon = ok.Value!;

            var totalProp = anon.GetType().GetProperty("total");
            var totalObj = totalProp!.GetValue(anon);
            var total = Assert.IsType<int>(totalObj);
            Assert.Equal(1, total);

            var itemsProp = anon.GetType().GetProperty("items");
            var itemsObj = itemsProp!.GetValue(anon) as System.Collections.IEnumerable;
            Assert.NotNull(itemsObj);

            var count = 0;
            foreach (var _ in itemsObj!)
                count++;

            Assert.Equal(1, count);
        }


        [Fact]
        public async Task GetAll_FiltersByRole()
        {
            using var db = CreateDbContext();
            db.Roles.Add(new Role { RoleId = 1, Name = "staff" });
            db.Roles.Add(new Role { RoleId = 2, Name = "other" });
            db.Users.Add(new User { UserID = 1, Name = "A", Email = "a@x.com", Password = "p", RoleId = 1, Status = "Active", CreateAt = DateTime.UtcNow });
            db.Users.Add(new User { UserID = 2, Name = "B", Email = "b@x.com", Password = "p", RoleId = 2, Status = "Active", CreateAt = DateTime.UtcNow });
            await db.SaveChangesAsync();
            var controller = CreateController(db);

            var result = await controller.GetAll(null, "staff", null);

            var ok = Assert.IsType<OkObjectResult>(result);
            var anon = ok.Value!;

            var totalProp = anon.GetType().GetProperty("total");
            var totalObj = totalProp!.GetValue(anon);
            var total = Assert.IsType<int>(totalObj);
            Assert.Equal(1, total);

            var itemsProp = anon.GetType().GetProperty("items");
            var itemsObj = itemsProp!.GetValue(anon) as System.Collections.IEnumerable;
            Assert.NotNull(itemsObj);

            var count = 0;
            foreach (var _ in itemsObj!)
                count++;

            Assert.Equal(1, count);
        }

        [Fact]
        public async Task GetAll_FiltersByStatus()
        {
            using var db = CreateDbContext();

            var role = new Role { RoleId = 1, Name = "staff" };
            db.Roles.Add(role);

            db.Users.Add(new User
            {
                UserID = 1,
                Name = "A",
                Email = "a@x.com",
                Password = "p",
                Status = "Active",
                RoleId = role.RoleId,
                CreateAt = DateTime.UtcNow
            });

            db.Users.Add(new User
            {
                UserID = 2,
                Name = "B",
                Email = "b@x.com",
                Password = "p",
                Status = "Inactive",
                RoleId = role.RoleId,
                CreateAt = DateTime.UtcNow
            });

            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var result = await controller.GetAll(null, null, "Active");

            var ok = Assert.IsType<OkObjectResult>(result);
            var anon = ok.Value!;

            var totalProp = anon.GetType().GetProperty("total");
            var totalObj = totalProp!.GetValue(anon);
            var total = Assert.IsType<int>(totalObj);
            Assert.Equal(1, total);

            var itemsProp = anon.GetType().GetProperty("items");
            var itemsObj = itemsProp!.GetValue(anon) as System.Collections.IEnumerable;
            Assert.NotNull(itemsObj);

            var count = 0;
            foreach (var _ in itemsObj!)
                count++;

            Assert.Equal(1, count);
        }


        [Fact]
        public async Task GetById_ReturnsNotFound_WhenMissing()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var result = await controller.GetById(1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var anon = nf.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Không tìm thấy nhân viên", msg);
        }

        [Fact]
        public async Task GetById_ReturnsEmployee_WhenExists()
        {
            using var db = CreateDbContext();
            var u = CreateUser(1, "a@x.com", "staff");
            db.Users.Add(u);
            await db.SaveChangesAsync();
            var controller = CreateController(db);

            var result = await controller.GetById(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var non = ok.Value;
            var prop = non.GetType().GetProperty("email");
            var email = prop?.GetValue(non)?.ToString();
            Assert.Equal("a@x.com", email);
        }

        [Fact]
        public async Task CreateEmployee_ReturnsBadRequest_WhenModelInvalid()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);
            controller.ModelState.AddModelError("Name", "Required");
            var dto = new ManagerEmployeesController.EmployeeCreateDto
            {
                Email = "a@x.com",
                Password = "Password1",
                RoleId = 1
            };

            var result = await controller.CreateEmployee(dto);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task CreateEmployee_ReturnsConflict_WhenEmailExists()
        {
            using var db = CreateDbContext();
            db.Users.Add(new User
            {
                UserID = 1,
                Name = "Old",
                Email = "dup@x.com",
                Password = "p",
                Status = "Active",
                CreateAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);
            var dto = new ManagerEmployeesController.EmployeeCreateDto
            {
                Name = "New",
                Email = "dup@x.com",
                Password = "Password1",
                RoleId = 1
            };

            var result = await controller.CreateEmployee(dto);

            var cf = Assert.IsType<ConflictObjectResult>(result);

            var anon = cf.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();

            Assert.Equal("Email đã tồn tại", msg);
        }


        [Fact]
        public async Task CreateEmployee_SetsDefaultsAndHashesPassword()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);
            var dto = new ManagerEmployeesController.EmployeeCreateDto
            {
                Name = " New Name ",
                Email = " user@x.com ",
                Password = "Password1",
                RoleId = 1,
                Status = null
            };

            var result = await controller.CreateEmployee(dto);

            var ok = Assert.IsType<OkObjectResult>(result);

            var anon = ok.Value;
            var prop = anon.GetType().GetProperty("id");
            Assert.NotNull(prop);
            var idObj = prop.GetValue(anon);
            var id = Assert.IsType<int>(idObj);

            var user = await db.Users.FirstAsync(u => u.UserID == id);
            Assert.Equal("New Name", user.Name);
            Assert.Equal("user@x.com", user.Email);
            Assert.Equal("Active", user.Status);
            Assert.NotEqual("Password1", user.Password);
        }


        [Fact]
        public async Task CreateEmployee_SavesImage_WhenProvided()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var stream = new MemoryStream(new byte[] { 1, 2, 3 });
            var file = new FormFile(stream, 0, stream.Length, "Image", "avatar.png");

            var dto = new ManagerEmployeesController.EmployeeCreateDto
            {
                Name = "User",
                Email = "img@x.com",
                Password = "Password1",
                RoleId = 1,
                Image = file
            };

            var result = await controller.CreateEmployee(dto);

            var ok = Assert.IsType<OkObjectResult>(result);

            var anon = ok.Value;
            var prop = anon.GetType().GetProperty("id");
            var idObj = prop?.GetValue(anon);
            var id = Assert.IsType<int>(idObj);

            var user = await db.Users.FirstAsync(u => u.UserID == id);
            Assert.False(string.IsNullOrWhiteSpace(user.Image));
        }

        [Fact]
        public async Task UpdateEmployee_ReturnsNotFound_WhenMissing()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);
            var dto = new ManagerEmployeesController.EmployeeUpdateDto { Name = "New" };

            var result = await controller.UpdateEmployee(1, dto);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var anon = nf.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Không tìm thấy nhân viên", msg);
        }

        [Fact]
        public async Task UpdateEmployee_ReturnsBadRequest_WhenProtectedUser()
        {
            using var db = CreateDbContext();
            var adminRole = new Role { RoleId = 1, Name = "Admin" };
            db.Roles.Add(adminRole);
            db.Users.Add(new User { UserID = 1, Name = "Admin", Email = "a@x.com", Password = "p", RoleId = 1, Role = adminRole, Status = "Active", CreateAt = DateTime.UtcNow });
            await db.SaveChangesAsync();
            var controller = CreateController(db);
            var dto = new ManagerEmployeesController.EmployeeUpdateDto { Name = "New" };

            var result = await controller.UpdateEmployee(1, dto);

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var anon = br.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Bạn không được phép chỉnh sửa thông tin tài khoản này", msg);
        }

        [Fact]
        public async Task UpdateEmployee_ReturnsBadRequest_WhenModelInvalid()
        {
            using var db = CreateDbContext();
            db.Users.Add(CreateUser(1));
            await db.SaveChangesAsync();
            var controller = CreateController(db);
            controller.ModelState.AddModelError("Email", "Invalid");
            var dto = new ManagerEmployeesController.EmployeeUpdateDto { Email = "bad" };

            var result = await controller.UpdateEmployee(1, dto);

            Assert.IsType<BadRequestObjectResult>(result);
        }


        [Fact]
        public async Task DeleteEmployee_ReturnsNotFound_WhenMissing()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var result = await controller.DeleteEmployee(1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var anon = nf.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Không tìm thấy nhân viên", msg);
        }

        [Fact]
        public async Task DeleteEmployee_ReturnsBadRequest_WhenProtectedUser()
        {
            using var db = CreateDbContext();
            var role = new Role { RoleId = 1, Name = "Admin" };
            db.Roles.Add(role);
            db.Users.Add(new User { UserID = 1, Name = "Admin", Email = "a@x.com", Password = "p", RoleId = 1, Role = role, Status = "Active", CreateAt = DateTime.UtcNow });
            await db.SaveChangesAsync();
            var controller = CreateController(db);

            var result = await controller.DeleteEmployee(1);
            var br = Assert.IsType<BadRequestObjectResult>(result);
            var anon = br.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();

            Assert.Equal("Bạn không được phép xóa tài khoản này", msg);
        }

        [Fact]
        public async Task DeleteEmployee_ReturnsNotFound_WhenAlreadyDeleted()
        {
            using var db = CreateDbContext();

            var user = new User
            {
                Name = "A",
                Email = "a@x.com",
                Password = "p",
                Status = "Inactive",
                DeletedAt = DateTime.UtcNow,
                CreateAt = DateTime.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var result = await controller.DeleteEmployee(user.UserID);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var anon = nf.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Không tìm thấy nhân viên", msg);
        }

        [Fact]
        public async Task GetRolesForEmployees_ReturnsAllRoles()
        {
            using var db = CreateDbContext();
            db.Roles.Add(new Role { RoleId = 1, Name = "staff" });
            db.Roles.Add(new Role { RoleId = 2, Name = "manager" });
            await db.SaveChangesAsync();
            var controller = CreateController(db);

            var result = await controller.GetRolesForEmployees();

            var ok = Assert.IsType<OkObjectResult>(result);
            var roles = Assert.IsAssignableFrom<IEnumerable<object>>(ok.Value);
            Assert.Equal(2, roles.Count());
        }
    }
}
