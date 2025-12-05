using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class AuthControllerTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new SaoKimDBContext(options);
        }

        private static string GetMessageFromResult(object value)
        {
            Assert.NotNull(value);

            var prop = value.GetType().GetProperty("message");
            Assert.NotNull(prop);

            var msg = prop.GetValue(value) as string;
            return msg ?? string.Empty;
        }

        private IConfiguration CreateTestConfiguration()
        {
            var settings = new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "0123456789ABCDEF0123456789ABCDEF",
                ["Jwt:Issuer"] = "test-issuer",
                ["Jwt:Audience"] = "test-audience"
            };

            return new ConfigurationBuilder()
                .AddInMemoryCollection(settings!)
                .Build();
        }

        private AuthController CreateController(SaoKimDBContext db)
        {
            var config = CreateTestConfiguration();
            var controller = new AuthController(db, config);

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };

            return controller;
        }

        #region Register

        [Fact]
        public async Task Register_ReturnsValidationProblem_WhenEmailExists()
        {
            using var db = CreateDbContext();

            var role = new Role { RoleId = 1, Name = "customer" };
            db.Roles.Add(role);
            db.Users.Add(new User
            {
                Email = "test@example.com",
                Password = BCrypt.Net.BCrypt.HashPassword("Abc12345"),
                RoleId = role.RoleId,
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var req = new RegisterRequest
            {
                Name = "New User",
                Email = "test@example.com",
                Password = "Abc12345",
                PhoneNumber = "0123"
            };

            var result = await controller.Register(req);

            var vp = Assert.IsType<ObjectResult>(result);
            var details = Assert.IsType<ValidationProblemDetails>(vp.Value);

            Assert.True(details.Errors.ContainsKey("Email"));
        }


        [Fact]
        public async Task Register_ReturnsValidationProblem_WhenPasswordNoLetterOrDigit()
        {
            using var db = CreateDbContext();

            db.Roles.Add(new Role { RoleId = 1, Name = "customer" });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var req = new RegisterRequest
            {
                Name = "User",
                Email = "new@example.com",
                Password = "12345678", 
                PhoneNumber = "0123"
            };

            var result = await controller.Register(req);

            var vp = Assert.IsType<ObjectResult>(result);
            var details = Assert.IsType<ValidationProblemDetails>(vp.Value);
            Assert.True(details.Errors.ContainsKey("Password"));
        }

        [Fact]
        public async Task Register_ReturnsValidationProblem_WhenRoleNotFound()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var req = new RegisterRequest
            {
                Name = "User",
                Email = "new@example.com",
                Password = "Abc12345",
                PhoneNumber = "0123",
                Role = "customer"   
            };

            var result = await controller.Register(req);

            var vp = Assert.IsType<ObjectResult>(result);
            var details = Assert.IsType<ValidationProblemDetails>(vp.Value);
            Assert.True(details.Errors.ContainsKey("Role"));
        }

        [Fact]
        public async Task Register_ReturnsOk_WhenSuccess()
        {
            using var db = CreateDbContext();

            db.Roles.Add(new Role { RoleId = 1, Name = "customer" });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var req = new RegisterRequest
            {
                Name = "User",
                Email = "new@example.com",
                Password = "Abc12345",
                PhoneNumber = "0123"
            };

            var result = await controller.Register(req);

            var ok = Assert.IsType<OkObjectResult>(result);
            var value = ok.Value;
            Assert.NotNull(value);

            var type = value.GetType();

            var msgProp = type.GetProperty("message");
            var emailProp = type.GetProperty("email");
            var roleProp = type.GetProperty("role");

            Assert.NotNull(msgProp);
            Assert.NotNull(emailProp);
            Assert.NotNull(roleProp);

            var message = msgProp!.GetValue(value) as string;
            var email = emailProp!.GetValue(value) as string;
            var role = roleProp!.GetValue(value) as string;

            Assert.Equal("Register successful", message);
            Assert.Equal("new@example.com", email);
            Assert.Equal("customer", role);

            var userInDb = await db.Users.FirstOrDefaultAsync(u => u.Email == "new@example.com");
            Assert.NotNull(userInDb);
            Assert.Equal("Active", userInDb!.Status);
        }


        #endregion

        #region Login

        [Fact]
        public async Task Login_ReturnsBadRequest_WhenEmailAndPasswordEmpty()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var req = new LoginRequest { Email = "", Password = "" };

            var result = await controller.Login(req);

            var bad = Assert.IsType<BadRequestObjectResult>(result);

            var message = GetMessageFromResult(bad.Value);
            Assert.Equal("Thông tin đăng nhập sai", message);
        }


        [Fact]
        public async Task Login_ReturnsUnauthorized_WhenUserNotFound()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var req = new LoginRequest { Email = "no@user.com", Password = "Abc12345" };

            var result = await controller.Login(req);

            var unauth = Assert.IsType<UnauthorizedObjectResult>(result);
            var message = GetMessageFromResult(unauth.Value);
            Assert.Equal("Thông tin đăng nhập sai", message);
        }

        [Fact]
        public async Task Login_ReturnsUnauthorized_WhenPasswordWrong()
        {
            using var db = CreateDbContext();
            db.Roles.Add(new Role { RoleId = 1, Name = "customer" });
            db.Users.Add(new User
            {
                Email = "user@example.com",
                Password = BCrypt.Net.BCrypt.HashPassword("Abc12345"),
                RoleId = 1,
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var req = new LoginRequest { Email = "user@example.com", Password = "Wrong123" };

            var result = await controller.Login(req);

            var unauth = Assert.IsType<UnauthorizedObjectResult>(result);
            var message = GetMessageFromResult(unauth.Value);
            Assert.Equal("Thông tin đăng nhập sai", message);
        }

        [Fact]
        public async Task Login_ReturnsUnauthorized_WhenUserNotActive()
        {
            using var db = CreateDbContext();
            db.Roles.Add(new Role { RoleId = 1, Name = "customer" });
            db.Users.Add(new User
            {
                Email = "user@example.com",
                Password = BCrypt.Net.BCrypt.HashPassword("Abc12345"),
                RoleId = 1,
                Status = "Blocked"
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var req = new LoginRequest { Email = "user@example.com", Password = "Abc12345" };

            var result = await controller.Login(req);

            var unauth = Assert.IsType<UnauthorizedObjectResult>(result);
            var message = GetMessageFromResult(unauth.Value);
            Assert.Contains("tạm khoá", message);
        }

        [Fact]
        public async Task Login_ReturnsOk_WithToken_WhenSuccess()
        {
            using var db = CreateDbContext();
            db.Roles.Add(new Role { RoleId = 1, Name = "customer" });
            db.Users.Add(new User
            {
                UserID = 123,
                Email = "user@example.com",
                Password = BCrypt.Net.BCrypt.HashPassword("Abc12345"),
                RoleId = 1,
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var req = new LoginRequest { Email = "user@example.com", Password = "Abc12345" };

            var result = await controller.Login(req);

            var ok = Assert.IsType<OkObjectResult>(result);
            var resp = Assert.IsType<LoginResponse>(ok.Value);

            Assert.Equal("user@example.com", resp.Email);
            Assert.Equal("customer", resp.Role);
            Assert.False(string.IsNullOrWhiteSpace(resp.Token));

            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(resp.Token);
            Assert.NotNull(jwt);

        }


        [Fact]
        public async Task ForgotPassword_ReturnsBadRequest_WhenEmailEmpty()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var resetService = new Mock<IPasswordResetService>();
            var emailService = new Mock<IEmailService>();

            var req = new ForgotPasswordRequest { Email = "" };

            var result = await controller.ForgotPassword(req, resetService.Object, emailService.Object);

            var bad = Assert.IsType<BadRequestObjectResult>(result);

            var message = GetMessageFromResult(bad.Value);
            Assert.Equal("Vui lòng nhập Email", message);
        }


        [Fact]
        public async Task ForgotPassword_ReturnsBadRequest_WhenUserNotFound()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var resetService = new Mock<IPasswordResetService>();
            var emailService = new Mock<IEmailService>();

            var req = new ForgotPasswordRequest { Email = "no@user.com" };

            var result = await controller.ForgotPassword(req, resetService.Object, emailService.Object);

            var bad = Assert.IsType<BadRequestObjectResult>(result);

            var message = GetMessageFromResult(bad.Value);
            Assert.Equal("Không tìm thấy Email", message);
        }

        [Fact]
        public async Task ForgotPassword_ReturnsOk_WhenSuccess()
        {
            using var db = CreateDbContext();
            db.Users.Add(new User
            {
                Email = "user@example.com",
                Password = BCrypt.Net.BCrypt.HashPassword("Abc12345"),
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var resetService = new Mock<IPasswordResetService>();
            resetService
                .Setup(s => s.GenerateCode("user@example.com", It.IsAny<TimeSpan>()))
                .Returns("CODE123");

            var emailService = new Mock<IEmailService>();
            emailService
                .Setup(s => s.SendAsync("user@example.com", It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask)
                .Verifiable();

            var req = new ForgotPasswordRequest { Email = "user@example.com" };

            var result = await controller.ForgotPassword(req, resetService.Object, emailService.Object);

            var ok = Assert.IsType<OkObjectResult>(result);
            var message = GetMessageFromResult(ok.Value);
            Assert.Contains("Link đặt lại mật khẩu", message);

            emailService.Verify();
        }

        #endregion

        #region ResetPassword

        [Fact]
        public async Task ResetPassword_ReturnsBadRequest_WhenMissingData()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var resetService = new Mock<IPasswordResetService>();

            var req = new ResetPasswordRequest { Email = "", NewPassword = "" };

            var result = await controller.ResetPassword(req, resetService.Object);

            var bad = Assert.IsType<BadRequestObjectResult>(result);
            var message = GetMessageFromResult(bad.Value);
            Assert.Equal("Missing data", message);
        }

        [Fact]
        public async Task ResetPassword_ReturnsBadRequest_WhenUserNotFound()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);
            var resetService = new Mock<IPasswordResetService>();

            var req = new ResetPasswordRequest
            {
                Email = "no@user.com",
                NewPassword = "Abc12345"
            };

            var result = await controller.ResetPassword(req, resetService.Object);

            var bad = Assert.IsType<BadRequestObjectResult>(result);
            var message = GetMessageFromResult(bad.Value);
            Assert.Equal("Không tìm thấy người dùng", message);
        }

        [Fact]
        public async Task ResetPassword_ReturnsBadRequest_WhenPasswordTooShort()
        {
            using var db = CreateDbContext();
            db.Users.Add(new User
            {
                Email = "user@example.com",
                Password = BCrypt.Net.BCrypt.HashPassword("OldPass1"),
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);
            var resetService = new Mock<IPasswordResetService>();

            var req = new ResetPasswordRequest
            {
                Email = "user@example.com",
                NewPassword = "Ab1" 
            };

            var result = await controller.ResetPassword(req, resetService.Object);

            var bad = Assert.IsType<BadRequestObjectResult>(result);
            var message = GetMessageFromResult(bad.Value);
            Assert.Equal("Mật khẩu mới phải có ít nhất 8 kí tự", message);
        }

        [Fact]
        public async Task ResetPassword_ReturnsValidationProblem_WhenPasswordNoLetterOrDigit()
        {
            using var db = CreateDbContext();
            db.Users.Add(new User
            {
                Email = "user@example.com",
                Password = BCrypt.Net.BCrypt.HashPassword("OldPass1"),
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);
            var resetService = new Mock<IPasswordResetService>();

            var req = new ResetPasswordRequest
            {
                Email = "user@example.com",
                NewPassword = "12345678" 
            };

            var result = await controller.ResetPassword(req, resetService.Object);

            var vp = Assert.IsType<ObjectResult>(result);
            var details = Assert.IsType<ValidationProblemDetails>(vp.Value);
            Assert.True(details.Errors.ContainsKey("Password"));
        }

        [Fact]
        public async Task ResetPassword_ReturnsOk_WhenSuccess()
        {
            using var db = CreateDbContext();
            db.Users.Add(new User
            {
                Email = "user@example.com",
                Password = BCrypt.Net.BCrypt.HashPassword("OldPass1"),
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);
            var resetService = new Mock<IPasswordResetService>();

            var req = new ResetPasswordRequest
            {
                Email = "user@example.com",
                NewPassword = "NewPass1"
            };

            var result = await controller.ResetPassword(req, resetService.Object);

            var ok = Assert.IsType<OkObjectResult>(result);
            var message = GetMessageFromResult(ok.Value);
            Assert.Equal("Đặt lại mật khẩu thành công", message);

            var user = await db.Users.FirstAsync(u => u.Email == "user@example.com");
            Assert.True(BCrypt.Net.BCrypt.Verify("NewPass1", user.Password));
        }

        #endregion

        #region ChangePassword

        [Fact]
        public async Task ChangePassword_UsesTokenEmail_WhenAvailable()
        {
            using var db = CreateDbContext();

            var email = "user@example.com";
            db.Users.Add(new User
            {
                Email = email,
                Password = BCrypt.Net.BCrypt.HashPassword("OldPass1"),
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var identity = new ClaimsIdentity(new[]
            {
        new Claim(ClaimTypes.Name, email)
    }, "TestAuth");

            controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(identity);

            var req = new ChangePasswordRequest
            {
                CurrentPassword = "OldPass1",
                NewPassword = "NewPass1"
            };

            var result = await controller.ChangePassword(req);

            var ok = Assert.IsType<OkObjectResult>(result);

            var value = ok.Value;
            Assert.NotNull(value);

            var messageProp = value.GetType().GetProperty("message");
            Assert.NotNull(messageProp);

            var message = messageProp.GetValue(value) as string;
            Assert.Contains("Thay đổi mật khẩu", message);

            var user = await db.Users.FirstAsync(u => u.Email == email);
            Assert.True(BCrypt.Net.BCrypt.Verify("NewPass1", user.Password));
        }

        [Fact]
        public async Task ChangePassword_ReturnsBadRequest_WhenNewPasswordTooShort()
        {
            using var db = CreateDbContext();
            db.Users.Add(new User
            {
                Email = "user@example.com",
                Password = BCrypt.Net.BCrypt.HashPassword("OldPass1"),
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var req = new ChangePasswordRequest
            {
                Email = "user@example.com",
                CurrentPassword = "OldPass1",
                NewPassword = "Ab1" 
            };

            var result = await controller.ChangePassword(req);

            var bad = Assert.IsType<BadRequestObjectResult>(result);

            var message = GetMessageFromResult(bad.Value);
            Assert.Equal("Mật khẩu mới phải có ít nhất 8 kí tự", message);
        }

        [Fact]
        public async Task ChangePassword_ReturnsBadRequest_WhenCurrentPasswordWrong()
        {
            using var db = CreateDbContext();
            db.Users.Add(new User
            {
                Email = "user@example.com",
                Password = BCrypt.Net.BCrypt.HashPassword("OldPass1"),
                Status = "Active"
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var req = new ChangePasswordRequest
            {
                Email = "user@example.com",
                CurrentPassword = "WrongPass",
                NewPassword = "NewPass1"
            };

            var result = await controller.ChangePassword(req);

            var bad = Assert.IsType<BadRequestObjectResult>(result);

            var value = bad.Value;
            Assert.NotNull(value);

            var prop = value.GetType().GetProperty("message");
            Assert.NotNull(prop);

            var message = prop.GetValue(value) as string;
            Assert.Equal("Mật khẩu cũ không đúng", message);
        }


        [Fact]
        public void Logout_ReturnsOk()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var result = controller.Logout();

            var ok = Assert.IsType<OkObjectResult>(result);
            var message = GetMessageFromResult(ok.Value);
            Assert.Equal("Đăng xuất thành công", message);
        }

        #endregion
    }
}
