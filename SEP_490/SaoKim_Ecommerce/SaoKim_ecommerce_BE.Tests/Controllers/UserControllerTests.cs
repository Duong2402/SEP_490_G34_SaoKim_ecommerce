using System.Collections;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class UsersControllerTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new SaoKimDBContext(options);
        }

        private UsersController CreateController(SaoKimDBContext db, string? email = null)
        {
            var controller = new UsersController(db);

            var httpContext = new DefaultHttpContext();

            if (!string.IsNullOrEmpty(email))
            {
                var identity = new ClaimsIdentity("TestAuth");
                identity.AddClaim(new Claim(ClaimTypes.Name, email));
                httpContext.User = new ClaimsPrincipal(identity);
            }

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };

            return controller;
        }

        private static string GetMessageFromResult(object value)
        {
            Assert.NotNull(value);
            var prop = value.GetType().GetProperty("message");
            Assert.NotNull(prop);
            var msg = prop.GetValue(value) as string;
            return msg ?? string.Empty;
        }

        #region GetAll

        [Fact]
        public async Task GetAll_Returns_Paged_List_Without_Filter()
        {
            using var db = CreateDbContext();

            var roleCustomer = new Role { RoleId = 1, Name = "customer" };
            var roleAdmin = new Role { RoleId = 2, Name = "admin" };
            db.Roles.AddRange(roleCustomer, roleAdmin);

            db.Users.AddRange(
                new User { UserID = 1, Name = "User 1", Email = "u1@test.com", Status = "Active", RoleId = 1, CreateAt = DateTime.UtcNow.AddMinutes(-3) },
                new User { UserID = 2, Name = "User 2", Email = "u2@test.com", Status = "Blocked", RoleId = 2, CreateAt = DateTime.UtcNow.AddMinutes(-2) },
                new User { UserID = 3, Name = "User 3", Email = "u3@test.com", Status = "Active", RoleId = 1, CreateAt = DateTime.UtcNow.AddMinutes(-1) }
            );
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var result = await controller.GetAll(q: null, role: null, status: null, page: 1, pageSize: 2);

            var ok = Assert.IsType<OkObjectResult>(result);
            var value = ok.Value;
            Assert.NotNull(value);

            var type = value.GetType();
            var itemsProp = type.GetProperty("items");
            var totalProp = type.GetProperty("total");
            var pageProp = type.GetProperty("page");
            var pageSizeProp = type.GetProperty("pageSize");
            var totalPagesProp = type.GetProperty("totalPages");

            Assert.NotNull(itemsProp);
            Assert.NotNull(totalProp);
            Assert.NotNull(pageProp);
            Assert.NotNull(pageSizeProp);
            Assert.NotNull(totalPagesProp);

            var items = (IEnumerable)itemsProp!.GetValue(value)!;
            var total = (int)totalProp!.GetValue(value)!;
            var pageValue = (int)pageProp!.GetValue(value)!;
            var pageSizeValue = (int)pageSizeProp!.GetValue(value)!;
            var totalPages = (int)totalPagesProp!.GetValue(value)!;

            Assert.Equal(3, total);
            Assert.Equal(1, pageValue);
            Assert.Equal(2, pageSizeValue);
            Assert.Equal(2, totalPages);
            Assert.Equal(2, items.Cast<object>().Count());
        }

        [Fact]
        public async Task GetAll_Filters_By_Role_And_Status()
        {
            using var db = CreateDbContext();

            var roleCustomer = new Role { RoleId = 1, Name = "customer" };
            var roleManager = new Role { RoleId = 2, Name = "manager" };
            db.Roles.AddRange(roleCustomer, roleManager);

            db.Users.AddRange(
                new User { UserID = 1, Name = "A", Email = "a@test.com", Status = "Active", RoleId = 1, CreateAt = DateTime.UtcNow.AddMinutes(-3) },
                new User { UserID = 2, Name = "B", Email = "b@test.com", Status = "Blocked", RoleId = 1, CreateAt = DateTime.UtcNow.AddMinutes(-2) },
                new User { UserID = 3, Name = "C", Email = "c@test.com", Status = "Active", RoleId = 2, CreateAt = DateTime.UtcNow.AddMinutes(-1) }
            );
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var result = await controller.GetAll(q: null, role: "customer", status: "Active", page: 1, pageSize: 10);

            var ok = Assert.IsType<OkObjectResult>(result);
            var value = ok.Value!;
            var itemsProp = value.GetType().GetProperty("items");
            Assert.NotNull(itemsProp);
            var items = itemsProp!.GetValue(value) as IEnumerable;
            Assert.NotNull(items);

            var list = items!.Cast<object>().ToList();
            Assert.Single(list);
        }

        #endregion

        #region GetById

        [Fact]
        public async Task GetById_Returns_NotFound_When_User_Not_Exists()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var result = await controller.GetById(1);

            var notFound = Assert.IsType<NotFoundObjectResult>(result);
            var msg = GetMessageFromResult(notFound.Value!);
            Assert.Equal("Không tìm thấy người dùng", msg);
        }

        [Fact]
        public async Task GetById_Returns_Ok_With_User_Data()
        {
            using var db = CreateDbContext();

            var role = new Role { RoleId = 1, Name = "customer" };
            db.Roles.Add(role);
            db.Users.Add(new User
            {
                UserID = 10,
                Name = "Test User",
                Email = "test@example.com",
                PhoneNumber = "0123",
                Status = "Active",
                Address = "Address",
                RoleId = role.RoleId,
                CreateAt = new DateTime(2025, 1, 1)
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var result = await controller.GetById(10);

            var ok = Assert.IsType<OkObjectResult>(result);
            var value = ok.Value!;
            var type = value.GetType();

            Assert.Equal(10, (int)type.GetProperty("id")!.GetValue(value)!);
            Assert.Equal("Test User", type.GetProperty("name")!.GetValue(value) as string);
            Assert.Equal("test@example.com", type.GetProperty("email")!.GetValue(value) as string);
            Assert.Equal("customer", type.GetProperty("role")!.GetValue(value) as string);
        }

        #endregion

        #region UpdateUser

        [Fact]
        public async Task UpdateUser_Returns_NotFound_When_User_Not_Exists()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var dto = new UsersController.UserUpdateDto
            {
                Name = "New Name"
            };

            var result = await controller.UpdateUser(1, dto);

            var notFound = Assert.IsType<NotFoundObjectResult>(result);
            var msg = GetMessageFromResult(notFound.Value!);
            Assert.Equal("Không tìm thấy người dùng", msg);
        }

        [Fact]
        public async Task UpdateUser_Updates_Fields_And_Returns_Ok()
        {
            using var db = CreateDbContext();

            db.Users.Add(new User
            {
                UserID = 1,
                Name = "Old Name",
                Address = "Old Address",
                PhoneNumber = "0000",
                Status = "Active",
                DOB = new DateTime(2000, 1, 1),
                RoleId = 1
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var dto = new UsersController.UserUpdateDto
            {
                Name = "New Name",
                Address = "New Address",
                PhoneNumber = "1111",
                Status = "Blocked",
                Dob = new DateTime(1999, 12, 31),
                RoleId = 2
            };

            var result = await controller.UpdateUser(1, dto);

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = GetMessageFromResult(ok.Value!);
            Assert.Equal("User updated", msg);

            var user = await db.Users.FirstAsync(u => u.UserID == 1);
            Assert.Equal("New Name", user.Name);
            Assert.Equal("New Address", user.Address);
            Assert.Equal("1111", user.PhoneNumber);
            Assert.Equal("Blocked", user.Status);
            Assert.Equal(new DateTime(1999, 12, 31), user.DOB);
            Assert.Equal(2, user.RoleId);
        }

        #endregion

        #region GetRoles

        [Fact]
        public async Task GetRoles_Returns_All_Roles_Sorted_By_Name()
        {
            using var db = CreateDbContext();

            db.Roles.AddRange(
                new Role { RoleId = 1, Name = "customer" },
                new Role { RoleId = 2, Name = "admin" },
                new Role { RoleId = 3, Name = "manager" }
            );
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var result = await controller.GetRoles();

            var ok = Assert.IsType<OkObjectResult>(result);
            var list = Assert.IsAssignableFrom<IEnumerable<object>>(ok.Value!);
            var arr = list.ToList();

            Assert.Equal(3, arr.Count);

            var first = arr[0];
            var second = arr[1];

            var firstName = first.GetType().GetProperty("name")!.GetValue(first) as string;
            var secondName = second.GetType().GetProperty("name")!.GetValue(second) as string;

            Assert.Equal("admin", firstName);
            Assert.Equal("customer", secondName);
        }

        #endregion

        #region GetMe

        [Fact]
        public async Task GetMe_Returns_Unauthorized_When_No_Email_In_Identity()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db, email: null);

            var result = await controller.GetMe();

            var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
            var msg = GetMessageFromResult(unauthorized.Value!);
            Assert.Equal("Chưa đăng nhập", msg);
        }

        [Fact]
        public async Task GetMe_Returns_NotFound_When_User_Not_Exists()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db, email: "user@example.com");

            var result = await controller.GetMe();

            var notFound = Assert.IsType<NotFoundObjectResult>(result);
            var msg = GetMessageFromResult(notFound.Value!);
            Assert.Equal("Không tìm thấy người dùng", msg);
        }

        [Fact]
        public async Task GetMe_Returns_Ok_With_Current_User_Profile()
        {
            using var db = CreateDbContext();

            var role = new Role { RoleId = 1, Name = "customer" };
            db.Roles.Add(role);

            db.Users.Add(new User
            {
                UserID = 10,
                Name = "Current User",
                Email = "me@example.com",
                PhoneNumber = "0123",
                Status = "Active",
                Address = "My Address",
                RoleId = role.RoleId,
                CreateAt = new DateTime(2025, 1, 1)
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db, email: "me@example.com");

            var result = await controller.GetMe();

            var ok = Assert.IsType<OkObjectResult>(result);
            var value = ok.Value!;
            var type = value.GetType();

            Assert.Equal(10, (int)type.GetProperty("id")!.GetValue(value)!);
            Assert.Equal("Current User", type.GetProperty("name")!.GetValue(value) as string);
            Assert.Equal("me@example.com", type.GetProperty("email")!.GetValue(value) as string);
            Assert.Equal("customer", type.GetProperty("role")!.GetValue(value) as string);
        }

        #endregion
    }
}
