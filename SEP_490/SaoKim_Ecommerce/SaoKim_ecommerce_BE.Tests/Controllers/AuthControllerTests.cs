using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using BCrypt.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Helpers;
using Xunit;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class AuthControllerTests
    {
        #region Helpers

        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new SaoKimDBContext(options);
        }

        private IConfiguration CreateConfig()
        {
            var dict = new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "this_is_a_super_long_fake_key_Duongprono_24022003",
                ["Jwt:Issuer"] = "test-issuer",
                ["Jwt:Audience"] = "test-audience"
            };

            return new ConfigurationBuilder()
                .AddInMemoryCollection(dict)
                .Build();
        }

        private AuthController CreateController(
            SaoKimDBContext db,
            string? emailInToken = null)
        {
            var controller = new AuthController(db, CreateConfig());

            var httpContext = new DefaultHttpContext();
            if (!string.IsNullOrEmpty(emailInToken))
            {
                var identity = new ClaimsIdentity(
                    new[] { new Claim(ClaimTypes.Name, emailInToken) },
                    "TestAuth");

                httpContext.User = new ClaimsPrincipal(identity);
            }

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };

            return controller;
        }

        private async Task<Role> SeedRoleAsync(SaoKimDBContext db, string roleName = "customer")
        {
            var role = new Role
            {
                Name = roleName
            };
            db.Roles.Add(role);
            await db.SaveChangesAsync();
            return role;
        }

        private async Task<User> SeedUserAsync(
            SaoKimDBContext db,
            string email = "test@example.com",
            string passwordPlain = "Abc12345",
            string roleName = "customer",
            string status = "Active")
        {
            var role = await db.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
            if (role == null)
            {
                role = await SeedRoleAsync(db, roleName);
            }

            var user = new User
            {
                Name = "Test User",
                Email = email,
                Password = BCrypt.Net.BCrypt.HashPassword(passwordPlain),
                RoleId = role.RoleId,
                Status = status,
                CreateAt = DateTime.UtcNow
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();
            return user;
        }

        #endregion

        #region Register (8 use cases)

        [Fact]
        public async Task Register_ReturnsValidationProblem_WhenModelInvalid()
        {
            using var db = CreateDbContext();
            await SeedRoleAsync(db, "customer");
            var controller = CreateController(db);

            controller.ModelState.AddModelError("Name", "Required");

            var req = new RegisterRequest
            {
                Email = "new@example.com",
                Password = "Abc12345",
                Role = "customer",
                Name = ""
            };

            var result = await controller.Register(req);

            var vp = Assert.IsType<ObjectResult>(result);

            var problemDetails = Assert.IsType<ValidationProblemDetails>(vp.Value);

            Assert.True(problemDetails.Errors.ContainsKey("Name"));
            Assert.Equal("Required", problemDetails.Errors["Name"].First());
        }

        [Fact]
        public async Task Register_ReturnsValidationProblem_WhenEmailExists()
        {
            using var db = CreateDbContext();
            await SeedRoleAsync(db, "customer");
            await SeedUserAsync(db, "dup@example.com");
            var controller = CreateController(db);

            var req = new RegisterRequest
            {
                Name = "New",
                Email = "dup@example.com",
                Password = "Abc12345",
                Role = "customer"
            };

            var result = await controller.Register(req);

            var vp = Assert.IsType<ObjectResult>(result);

            var problemDetails = Assert.IsType<ValidationProblemDetails>(vp.Value);

            Assert.True(problemDetails.Errors.ContainsKey("Email"));
            Assert.Equal(
                "Email đã tồn tại",
                problemDetails.Errors["Email"].First()
            );
        }


        [Fact]
        public async Task Register_ReturnsValidationProblem_WhenPasswordMissingLetterOrDigit()
        {
            using var db = CreateDbContext();
            await SeedRoleAsync(db, "customer");
            var controller = CreateController(db);

            var req = new RegisterRequest
            {
                Name = "New",
                Email = "pwfail@example.com",
                Password = "12345678", 
                Role = "customer"
            };

            var result = await controller.Register(req);

            var vp = Assert.IsType<ObjectResult>(result);
            var problemDetails = Assert.IsType<ValidationProblemDetails>(vp.Value);

            Assert.True(problemDetails.Errors.ContainsKey("Password"));
            Assert.Equal(
                "Mật khẩu phải có 1 chữ cái và 1 chữ số",
                problemDetails.Errors["Password"].First()
            );
        }

        [Fact]
        public async Task Register_ReturnsValidationProblem_WhenRoleNotFound()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var req = new RegisterRequest
            {
                Name = "New",
                Email = "abc@example.com",
                Password = "Abc12345",
                Role = "admin"
            };

            var result = await controller.Register(req);

            var vp = Assert.IsType<ObjectResult>(result);

            var problemDetails = Assert.IsType<ValidationProblemDetails>(vp.Value);

            Assert.True(problemDetails.Errors.ContainsKey("Role"));
            Assert.Equal("Role not found", problemDetails.Errors["Role"].First());
        }

        [Fact]
        public async Task Register_UsesDefaultCustomerRole_WhenRoleEmpty()
        {
            using var db = CreateDbContext();
            var customer = await SeedRoleAsync(db, "customer");
            var controller = CreateController(db);

            var req = new RegisterRequest
            {
                Name = "New",
                Email = "new@example.com",
                Password = "Abc12345",
                Role = null
            };

            var result = await controller.Register(req);

            var ok = Assert.IsType<OkObjectResult>(result);

            var anon = ok.Value;

            var emailProp = anon?.GetType().GetProperty("email");
            var roleProp = anon?.GetType().GetProperty("role");

            var email = emailProp?.GetValue(anon)?.ToString();
            var role = roleProp?.GetValue(anon)?.ToString();

            Assert.Equal("new@example.com", email);
            Assert.Equal(customer.Name, role);
        }

        [Fact]
        public async Task Register_Success_WhenValidWithoutImage()
        {
            using var db = CreateDbContext();
            await SeedRoleAsync(db, "customer");
            var controller = CreateController(db);

            var req = new RegisterRequest
            {
                Name = "New User",
                Email = "new2@example.com",
                Password = "Abc12345",
                Role = "customer"
            };

            var result = await controller.Register(req);

            var ok = Assert.IsType<OkObjectResult>(result);

            var anon = ok.Value;
            var prop = anon?.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();

            Assert.Equal("Register successful", msg);
        }

        [Fact]
        public async Task Register_SetsStatusActive_AndCreateAt()
        {
            using var db = CreateDbContext();
            await SeedRoleAsync(db, "customer");
            var controller = CreateController(db);

            var req = new RegisterRequest
            {
                Name = "New3",
                Email = "new3@example.com",
                Password = "Abc12345",
                Role = "customer"
            };

            await controller.Register(req);

            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == "new3@example.com");
            Assert.NotNull(user);
            Assert.Equal("Active", user!.Status);
            Assert.True(user.CreateAt != default);
        }

        [Fact]
        public async Task Register_StoresHashedPassword()
        {
            using var db = CreateDbContext();
            await SeedRoleAsync(db, "customer");
            var controller = CreateController(db);

            var req = new RegisterRequest
            {
                Name = "New4",
                Email = "new4@example.com",
                Password = "Abc12345",
                Role = "customer"
            };

            await controller.Register(req);

            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == "new4@example.com");
            Assert.NotNull(user);
            Assert.NotEqual("Abc12345", user!.Password);
            Assert.True(BCrypt.Net.BCrypt.Verify("Abc12345", user.Password));
        }

        #endregion

        #region Login (12+ use cases)

        [Fact]
        public async Task Login_BadRequest_WhenEmailAndPasswordEmpty()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var req = new LoginRequest { Email = "", Password = "" };

            var result = await controller.Login(req);

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var anon = br.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Thông tin đăng nhập sai", msg);
        }

        [Fact]
        public async Task Login_BadRequest_WhenEmailMissing()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var req = new LoginRequest { Email = "", Password = "Abc12345" };

            var result = await controller.Login(req);

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var anon = br.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Vui lòng nhập email", msg);
        }

        [Fact]
        public async Task Login_BadRequest_WhenPasswordMissing()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var req = new LoginRequest { Email = "test@example.com", Password = "" };

            var result = await controller.Login(req);

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var anon = br.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Vui lòng nhập mật khẩu", msg);
        }

        [Fact]
        public async Task Login_Unauthorized_WhenUserNotFound()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var req = new LoginRequest { Email = "notfound@example.com", Password = "Abc12345" };

            var result = await controller.Login(req);

            var un = Assert.IsType<UnauthorizedObjectResult>(result);
            var anon = un.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Thông tin đăng nhập sai", msg);
        }

        [Fact]
        public async Task Login_Unauthorized_WhenWrongPassword()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "user1@example.com", "Correct123");
            var controller = CreateController(db);

            var req = new LoginRequest { Email = "user1@example.com", Password = "Wrong999" };

            var result = await controller.Login(req);

            var un = Assert.IsType<UnauthorizedObjectResult>(result);
            var anon = un.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Thông tin đăng nhập sai", msg);
        }

        [Fact]
        public async Task Login_Unauthorized_WhenStatusNotActive()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "inactive@example.com", "Abc12345", status: "Inactive");
            var controller = CreateController(db);

            var req = new LoginRequest { Email = "inactive@example.com", Password = "Abc12345" };

            var result = await controller.Login(req);

            var un = Assert.IsType<UnauthorizedObjectResult>(result);
            var anon = un.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Contains("Tài khoản của bạn hiện đang bị tạm khoá", msg);
        }

        [Fact]
        public async Task Login_Unauthorized_WhenStatusInactiveWithDifferentCasing()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "inactive2@example.com", "Abc12345", status: "inACTIVE");
            var controller = CreateController(db);

            var req = new LoginRequest { Email = "inactive2@example.com", Password = "Abc12345" };

            var result = await controller.Login(req);

            var un = Assert.IsType<UnauthorizedObjectResult>(result);
            var anon = un.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Contains("Tài khoản của bạn hiện đang bị tạm khoá", msg);
        }

        [Fact]
        public async Task Login_ReturnsToken_WhenSuccess()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "ok@example.com", "Abc12345");
            var controller = CreateController(db);

            var req = new LoginRequest { Email = "ok@example.com", Password = "Abc12345" };

            var result = await controller.Login(req);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<LoginResponse>(ok.Value);
            Assert.False(string.IsNullOrEmpty(res.Token));
        }

        [Fact]
        public async Task Login_IncludesEmailInResponse()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "ok2@example.com", "Abc12345");
            var controller = CreateController(db);

            var req = new LoginRequest { Email = "ok2@example.com", Password = "Abc12345" };

            var result = await controller.Login(req);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<LoginResponse>(ok.Value);
            Assert.Equal("ok2@example.com", res.Email);
        }

        [Fact]
        public async Task Login_IncludesRoleInResponse()
        {
            using var db = CreateDbContext();
            await SeedRoleAsync(db, "staff");
            await SeedUserAsync(db, "staff@example.com", "Abc12345", roleName: "staff");
            var controller = CreateController(db);

            var req = new LoginRequest { Email = "staff@example.com", Password = "Abc12345" };

            var result = await controller.Login(req);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<LoginResponse>(ok.Value);
            Assert.Equal("staff", res.Role);
        }

        [Fact]
        public async Task Login_Unauthorized_WhenPasswordHashNotMatch()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "hashfail@example.com", "Correct123");
            var controller = CreateController(db);

            var req = new LoginRequest { Email = "hashfail@example.com", Password = "Another999" };

            var result = await controller.Login(req);

            var un = Assert.IsType<UnauthorizedObjectResult>(result);

            var anon = un.Value;
            var prop = anon?.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();

            Assert.Equal("Thông tin đăng nhập sai", msg);
        }


        [Fact]
        public async Task Login_Unauthorized_WhenEmailHasLeadingTrailingSpaces()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "space@example.com", "Abc12345");
            var controller = CreateController(db);

            var req = new LoginRequest { Email = "  space@example.com  ", Password = "Abc12345" };

            var result = await controller.Login(req);

            Assert.IsType<UnauthorizedObjectResult>(result);
        }

        #endregion

        #region ChangePassword (16+ use cases)

        [Fact]
        public async Task ChangePassword_BadRequest_WhenEmailMissingInTokenAndRequest()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db, emailInToken: null);

            var req = new ChangePasswordRequest
            {
                Email = null,
                CurrentPassword = "Old12345",
                NewPassword = "New12345"
            };

            var result = await controller.ChangePassword(req);

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var anon = br.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Vui lòng nhập Email", msg);
        }

        [Fact]
        public async Task ChangePassword_BadRequest_WhenMissingCurrentPassword()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "cp1@example.com", "Old12345");
            var controller = CreateController(db);

            var req = new ChangePasswordRequest
            {
                Email = "cp1@example.com",
                CurrentPassword = "",
                NewPassword = "New12345"
            };

            var result = await controller.ChangePassword(req);

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var anon = br.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Vui lòng nhập mật khẩu mới và mật khẩu cũ", msg);
        }

        [Fact]
        public async Task ChangePassword_BadRequest_WhenMissingNewPassword()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "cp2@example.com", "Old12345");
            var controller = CreateController(db);

            var req = new ChangePasswordRequest
            {
                Email = "cp2@example.com",
                CurrentPassword = "Old12345",
                NewPassword = ""
            };

            var result = await controller.ChangePassword(req);

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var anon = br.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Vui lòng nhập mật khẩu mới và mật khẩu cũ", msg);
        }

        [Fact]
        public async Task ChangePassword_BadRequest_WhenNewPasswordTooShort()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "cp3@example.com", "Old12345");
            var controller = CreateController(db);

            var req = new ChangePasswordRequest
            {
                Email = "cp3@example.com",
                CurrentPassword = "Old12345",
                NewPassword = "Abc12"
            };

            var result = await controller.ChangePassword(req);

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var anon = br.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Mật khẩu mới phải có ít nhất 8 kí tự", msg);
        }

        [Fact]
        public async Task ChangePassword_BadRequest_WhenNewPasswordSameAsCurrent()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "cp4@example.com", "Same1234");
            var controller = CreateController(db);

            var req = new ChangePasswordRequest
            {
                Email = "cp4@example.com",
                CurrentPassword = "Same1234",
                NewPassword = "Same1234"
            };

            var result = await controller.ChangePassword(req);

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var anon = br.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Mật khẩu mới không được giống với mật khẩu cũ", msg);
        }

        [Fact]
        public async Task ChangePassword_ValidationProblem_WhenNewPasswordNoLetter()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "cp5@example.com", "Old12345");
            var controller = CreateController(db);

            var req = new ChangePasswordRequest
            {
                Email = "cp5@example.com",
                CurrentPassword = "Old12345",
                NewPassword = "12345678"
            };

            var result = await controller.ChangePassword(req);

            var vp = Assert.IsType<ObjectResult>(result);

            var problemDetails = Assert.IsType<ValidationProblemDetails>(vp.Value);

            Assert.True(problemDetails.Errors.ContainsKey("Password"));
            Assert.Equal(
                "Mật khẩu phải có 1 chữ cái và 1 chữ số",
                problemDetails.Errors["Password"].First()
            );
        }

        [Fact]
        public async Task ChangePassword_ValidationProblem_WhenNewPasswordNoDigit()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "cp6@example.com", "Old12345");
            var controller = CreateController(db);

            var req = new ChangePasswordRequest
            {
                Email = "cp6@example.com",
                CurrentPassword = "Old12345",
                NewPassword = "abcdefgh"
            };

            var result = await controller.ChangePassword(req);

            var vp = Assert.IsType<ObjectResult>(result);
            var problemDetails = Assert.IsType<ValidationProblemDetails>(vp.Value);

            Assert.True(problemDetails.Errors.ContainsKey("Password"));
            Assert.Equal(
                "Mật khẩu phải có 1 chữ cái và 1 chữ số",
                problemDetails.Errors["Password"].First()
            );
        }


        [Fact]
        public async Task ChangePassword_NotFound_WhenUserNotExist()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var req = new ChangePasswordRequest
            {
                Email = "notexist@example.com",
                CurrentPassword = "Old12345",
                NewPassword = "New12345"
            };

            var result = await controller.ChangePassword(req);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var anon = nf.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Không tìm thấy người dùng", msg);
        }

        [Fact]
        public async Task ChangePassword_BadRequest_WhenCurrentPasswordIncorrect()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "cp7@example.com", "CorrectOld123");
            var controller = CreateController(db);

            var req = new ChangePasswordRequest
            {
                Email = "cp7@example.com",
                CurrentPassword = "WrongOld999",
                NewPassword = "New12345"
            };

            var result = await controller.ChangePassword(req);

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var anon = br.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Mật khẩu cũ không đúng", msg);
        }

        [Fact]
        public async Task ChangePassword_Success_UsingReqEmail()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "cp8@example.com", "Old12345");
            var controller = CreateController(db, emailInToken: null);

            var req = new ChangePasswordRequest
            {
                Email = "cp8@example.com",
                CurrentPassword = "Old12345",
                NewPassword = "New12345"
            };

            var result = await controller.ChangePassword(req);

            var ok = Assert.IsType<OkObjectResult>(result);
            var anon = ok.Value;
            var prop = anon.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Thay đổi mật khẩu thành ông", msg);

            var user = await db.Users.FirstAsync(u => u.Email == "cp8@example.com");
            Assert.True(BCrypt.Net.BCrypt.Verify("New12345", user.Password));
        }

        [Fact]
        public async Task ChangePassword_Success_UsingTokenEmail()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "cp9@example.com", "Old12345");
            var controller = CreateController(db, emailInToken: "cp9@example.com");

            var req = new ChangePasswordRequest
            {
                Email = null,
                CurrentPassword = "Old12345",
                NewPassword = "New12345"
            };

            var result = await controller.ChangePassword(req);

            var ok = Assert.IsType<OkObjectResult>(result);
            var user = await db.Users.FirstAsync(u => u.Email == "cp9@example.com");
            Assert.True(BCrypt.Net.BCrypt.Verify("New12345", user.Password));
        }

        [Fact]
        public async Task ChangePassword_UpdatesPasswordHash()
        {
            using var db = CreateDbContext();
            var user = await SeedUserAsync(db, "cp10@example.com", "Old12345");
            var oldHash = user.Password;

            var controller = CreateController(db);

            var req = new ChangePasswordRequest
            {
                Email = "cp10@example.com",
                CurrentPassword = "Old12345",
                NewPassword = "New12345"
            };

            await controller.ChangePassword(req);

            var updated = await db.Users.FirstAsync(u => u.Email == "cp10@example.com");
            Assert.NotEqual(oldHash, updated.Password);
            Assert.True(BCrypt.Net.BCrypt.Verify("New12345", updated.Password));
        }

        [Fact]
        public async Task ChangePassword_DoesNotChangePassword_WhenValidationFails()
        {
            using var db = CreateDbContext();
            var user = await SeedUserAsync(db, "cp11@example.com", "Old12345");
            var oldHash = user.Password;

            var controller = CreateController(db);

            var req = new ChangePasswordRequest
            {
                Email = "cp11@example.com",
                CurrentPassword = "Old12345",
                NewPassword = "short"
            };

            await controller.ChangePassword(req);

            var updated = await db.Users.FirstAsync(u => u.Email == "cp11@example.com");
            Assert.Equal(oldHash, updated.Password);
        }

        [Fact]
        public async Task ChangePassword_PrefersTokenEmail_OverRequestEmail()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "token@example.com", "Old12345");
            await SeedUserAsync(db, "other@example.com", "OldOther123");
            var controller = CreateController(db, emailInToken: "token@example.com");

            var req = new ChangePasswordRequest
            {
                Email = "other@example.com",
                CurrentPassword = "Old12345",
                NewPassword = "New12345"
            };

            var result = await controller.ChangePassword(req);

            var ok = Assert.IsType<OkObjectResult>(result);

            var tokenUser = await db.Users.FirstAsync(u => u.Email == "token@example.com");
            var otherUser = await db.Users.FirstAsync(u => u.Email == "other@example.com");

            Assert.True(BCrypt.Net.BCrypt.Verify("New12345", tokenUser.Password));
            Assert.True(BCrypt.Net.BCrypt.Verify("OldOther123", otherUser.Password));
        }

        [Fact]
        public async Task ChangePassword_Fails_WhenEmailWithSpaces_DueToExactLookup()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "cp12@example.com", "Old12345");
            var controller = CreateController(db);

            var req = new ChangePasswordRequest
            {
                Email = "  cp12@example.com  ",
                CurrentPassword = "Old12345",
                NewPassword = "New12345"
            };

            var result = await controller.ChangePassword(req);

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task ChangePassword_EmailLookupIsCaseSensitive_CurrentBehavior()
        {
            using var db = CreateDbContext();
            await SeedUserAsync(db, "cp13@example.com", "Old12345");
            var controller = CreateController(db);

            var req = new ChangePasswordRequest
            {
                Email = "CP13@example.com",
                CurrentPassword = "Old12345",
                NewPassword = "New12345"
            };

            var result = await controller.ChangePassword(req);

            Assert.IsType<NotFoundObjectResult>(result);
        }

        #endregion

        #region Logout (2 use cases)

        [Fact]
        public void Logout_ReturnsOkResult()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var result = controller.Logout();

            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public void Logout_ReturnsSuccessMessage()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var result = controller.Logout();

            var ok = Assert.IsType<OkObjectResult>(result);
            var anon = ok.Value;
            var prop = anon?.GetType().GetProperty("message");
            var msg = prop?.GetValue(anon)?.ToString();
            Assert.Equal("Đăng xuất thành công", msg);
        }

        #endregion

        #region AuthHelper.HasLetterAndDigit (4 use cases)

        [Fact]
        public void HasLetterAndDigit_ReturnsTrue_WhenPasswordContainsLetterAndDigit()
        {
            var result = AuthHelper.HasLetterAndDigit("Abc12345");
            Assert.True(result);
        }

        [Fact]
        public void HasLetterAndDigit_ReturnsFalse_WhenPasswordOnlyDigits()
        {
            var result = AuthHelper.HasLetterAndDigit("123456789");
            Assert.False(result);
        }

        [Fact]
        public void HasLetterAndDigit_ReturnsFalse_WhenPasswordOnlyLetters()
        {
            var result = AuthHelper.HasLetterAndDigit("abcdefgh");
            Assert.False(result);
        }

        [Fact]
        public void HasLetterAndDigit_ReturnsFalse_WhenPasswordEmpty()
        {
            var result = AuthHelper.HasLetterAndDigit("");
            Assert.False(result);
        }

        #endregion
    }
}
