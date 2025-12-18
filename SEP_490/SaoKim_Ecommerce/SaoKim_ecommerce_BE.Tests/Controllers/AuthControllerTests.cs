using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Model.Requests;
using SaoKim_ecommerce_BE.Models.Requests;
using SaoKim_ecommerce_BE.Services;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class AuthControllerTests
    {
        private static AuthController CreateController(
            Mock<IAuthService> authMock,
            string? emailInToken = null)
        {
            var controller = new AuthController(authMock.Object);

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

        #region Register

        [Fact]
        public async Task Register_ReturnsBadRequest_WithErrors_WhenModelInvalid()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);
            var controller = CreateController(auth);

            controller.ModelState.AddModelError("Name", "Required");

            var req = new RegisterRequest
            {
                Email = "new@example.com",
                Password = "Abc12345",
                Role = "customer",
                Name = ""
            };

            var result = await controller.Register(req);

            var bad = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal(400, bad.StatusCode);

            var json = JsonSerializer.Serialize(bad.Value);
            using var doc = JsonDocument.Parse(json);

            Assert.True(doc.RootElement.TryGetProperty("message", out var msg));
            Assert.Equal("Validation failed", msg.GetString());

            var errors = doc.RootElement.GetProperty("errors");
            Assert.True(errors.TryGetProperty("Name", out var nameErrors));
            Assert.Equal(JsonValueKind.Array, nameErrors.ValueKind);
            Assert.Equal("Required", nameErrors[0].GetString());

            auth.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task Register_ReturnsOk_WithPayloadFromService()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            var serviceResult = new RegisterResponse
            {
                Message = "Register successful",
                Email = "new@example.com",
                Role = "customer",
                Image = null
            };

            auth.Setup(s => s.RegisterAsync(It.IsAny<RegisterRequest>()))
                .Returns(Task.FromResult(serviceResult));

            var controller = CreateController(auth);

            var req = new RegisterRequest
            {
                Name = "New",
                Email = "new@example.com",
                Password = "Abc12345",
                Role = "customer"
            };

            var result = await controller.Register(req);

            var ok = Assert.IsType<OkObjectResult>(result);
            var value = ok.Value;

            var msg = value?.GetType().GetProperty("message")?.GetValue(value)?.ToString();
            var email = value?.GetType().GetProperty("email")?.GetValue(value)?.ToString();
            var role = value?.GetType().GetProperty("role")?.GetValue(value)?.ToString();

            Assert.Equal("Register successful", msg);
            Assert.Equal("new@example.com", email);
            Assert.Equal("customer", role);

            auth.Verify(s => s.RegisterAsync(It.Is<RegisterRequest>(r => r.Email == "new@example.com")), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task Register_ReturnsBadRequest_WhenServiceThrowsArgumentException()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.RegisterAsync(It.IsAny<RegisterRequest>()))
                .ThrowsAsync(new ArgumentException("Email đã tồn tại"));

            var controller = CreateController(auth);

            var req = new RegisterRequest
            {
                Name = "New",
                Email = "dup@example.com",
                Password = "Abc12345",
                Role = "customer"
            };

            var result = await controller.Register(req);

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var msg = br.Value?.GetType().GetProperty("message")?.GetValue(br.Value)?.ToString();

            Assert.Equal("Email đã tồn tại", msg);

            auth.Verify(s => s.RegisterAsync(It.IsAny<RegisterRequest>()), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        #endregion

        #region Login

        [Fact]
        public async Task Login_ReturnsOk_WhenServiceSucceeds()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            var loginRes = new LoginResponse
            {
                Token = "token",
                Email = "ok@example.com",
                Role = "customer"
            };

            auth.Setup(s => s.LoginAsync(It.IsAny<LoginRequest>()))
                .Returns(Task.FromResult(loginRes));

            var controller = CreateController(auth);

            var result = await controller.Login(new LoginRequest
            {
                Email = "ok@example.com",
                Password = "Abc12345"
            });

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<LoginResponse>(ok.Value);

            Assert.Equal("ok@example.com", res.Email);
            Assert.Equal("customer", res.Role);
            Assert.False(string.IsNullOrEmpty(res.Token));

            auth.Verify(s => s.LoginAsync(It.Is<LoginRequest>(r => r.Email == "ok@example.com")), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task Login_ReturnsBadRequest_WhenServiceThrowsArgumentException()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.LoginAsync(It.IsAny<LoginRequest>()))
                .ThrowsAsync(new ArgumentException("Vui lòng nhập email"));

            var controller = CreateController(auth);

            var result = await controller.Login(new LoginRequest { Email = "", Password = "x" });

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var msg = br.Value?.GetType().GetProperty("message")?.GetValue(br.Value)?.ToString();

            Assert.Equal("Vui lòng nhập email", msg);

            auth.Verify(s => s.LoginAsync(It.IsAny<LoginRequest>()), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task Login_ReturnsUnauthorized_WhenServiceThrowsUnauthorizedAccessException()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.LoginAsync(It.IsAny<LoginRequest>()))
                .ThrowsAsync(new UnauthorizedAccessException("Thông tin đăng nhập sai"));

            var controller = CreateController(auth);

            var result = await controller.Login(new LoginRequest { Email = "a@a.com", Password = "bad" });

            var un = Assert.IsType<UnauthorizedObjectResult>(result);
            var msg = un.Value?.GetType().GetProperty("message")?.GetValue(un.Value)?.ToString();

            Assert.Equal("Thông tin đăng nhập sai", msg);

            auth.Verify(s => s.LoginAsync(It.IsAny<LoginRequest>()), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        #endregion

        #region Forgot/Reset password

        [Fact]
        public async Task ForgotPassword_ReturnsOk_WhenServiceSucceeds()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.ForgotPasswordAsync(It.IsAny<ForgotPasswordRequest>()))
                .Returns(Task.CompletedTask);

            var controller = CreateController(auth);

            var result = await controller.ForgotPassword(new ForgotPasswordRequest { Email = "a@a.com" });

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();

            Assert.Equal("Link đặt lại mật khẩu đã gửi đến email của bạn", msg);

            auth.Verify(s => s.ForgotPasswordAsync(It.IsAny<ForgotPasswordRequest>()), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task ResetPassword_ReturnsOk_WhenServiceSucceeds()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.ResetPasswordAsync(It.IsAny<ResetPasswordRequest>()))
                .Returns(Task.CompletedTask);

            var controller = CreateController(auth);

            var result = await controller.ResetPassword(new ResetPasswordRequest());

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();

            Assert.Equal("Đặt lại mật khẩu thành công", msg);

            auth.Verify(s => s.ResetPasswordAsync(It.IsAny<ResetPasswordRequest>()), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        #endregion

        #region ChangePassword

        [Fact]
        public async Task ChangePassword_PassesTokenEmail_ToService()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.ChangePasswordAsync("cp9@example.com", It.IsAny<ChangePasswordRequest>()))
                .Returns(Task.CompletedTask);

            var controller = CreateController(auth, emailInToken: "cp9@example.com");

            var result = await controller.ChangePassword(new ChangePasswordRequest
            {
                Email = null,
                CurrentPassword = "Old12345",
                NewPassword = "New12345"
            });

            Assert.IsType<OkObjectResult>(result);

            auth.Verify(s => s.ChangePasswordAsync("cp9@example.com", It.IsAny<ChangePasswordRequest>()), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task ChangePassword_ReturnsBadRequest_WhenServiceThrowsArgumentException()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.ChangePasswordAsync(It.IsAny<string?>(), It.IsAny<ChangePasswordRequest>()))
                .ThrowsAsync(new ArgumentException("Mật khẩu cũ không đúng"));

            var controller = CreateController(auth, emailInToken: "cp@example.com");

            var result = await controller.ChangePassword(new ChangePasswordRequest());

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var msg = br.Value?.GetType().GetProperty("message")?.GetValue(br.Value)?.ToString();

            Assert.Equal("Mật khẩu cũ không đúng", msg);

            auth.Verify(s => s.ChangePasswordAsync("cp@example.com", It.IsAny<ChangePasswordRequest>()), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task ChangePassword_ReturnsNotFound_WhenServiceThrowsKeyNotFound()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.ChangePasswordAsync(It.IsAny<string?>(), It.IsAny<ChangePasswordRequest>()))
                .ThrowsAsync(new KeyNotFoundException("Không tìm thấy người dùng"));

            var controller = CreateController(auth, emailInToken: "x@example.com");

            var result = await controller.ChangePassword(new ChangePasswordRequest());

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var msg = nf.Value?.GetType().GetProperty("message")?.GetValue(nf.Value)?.ToString();

            Assert.Equal("Không tìm thấy người dùng", msg);

            auth.Verify(s => s.ChangePasswordAsync("x@example.com", It.IsAny<ChangePasswordRequest>()), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        #endregion

        #region Logout

        [Fact]
        public void Logout_ReturnsSuccessMessage()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);
            var controller = CreateController(auth);

            var result = controller.Logout();

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();

            Assert.Equal("Đăng xuất thành công", msg);
            auth.VerifyNoOtherCalls();
        }

        #endregion

        #region VerifyRegister

        [Fact]
        public async Task VerifyRegister_ReturnsOk_WhenServiceSucceeds()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.VerifyRegisterAsync(It.IsAny<VerifyRegisterRequest>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            var controller = CreateController(auth);
            controller.ControllerContext.HttpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("127.0.0.1");

            var result = await controller.VerifyRegister(new VerifyRegisterRequest
            {
                Email = "a@a.com",
                Code = "123456"
            });

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();

            Assert.Equal("Xác thực email thành công. Tài khoản đã được tạo.", msg);

            auth.Verify(s => s.VerifyRegisterAsync(
                It.Is<VerifyRegisterRequest>(r => r.Email == "a@a.com" && r.Code == "123456"),
                It.Is<string>(ip => ip == "127.0.0.1")), Times.Once);

            auth.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task VerifyRegister_UsesUnknownIp_WhenRemoteIpNull()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.VerifyRegisterAsync(It.IsAny<VerifyRegisterRequest>(), "unknown"))
                .Returns(Task.CompletedTask);

            var controller = CreateController(auth);
            controller.ControllerContext.HttpContext.Connection.RemoteIpAddress = null;

            var result = await controller.VerifyRegister(new VerifyRegisterRequest
            {
                Email = "a@a.com",
                Code = "123456"
            });

            Assert.IsType<OkObjectResult>(result);

            auth.Verify(s => s.VerifyRegisterAsync(It.IsAny<VerifyRegisterRequest>(), "unknown"), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task VerifyRegister_ReturnsBadRequest_WhenServiceThrowsArgumentException()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.VerifyRegisterAsync(It.IsAny<VerifyRegisterRequest>(), It.IsAny<string>()))
                .ThrowsAsync(new ArgumentException("Mã OTP không đúng."));

            var controller = CreateController(auth);
            controller.ControllerContext.HttpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("10.0.0.2");

            var result = await controller.VerifyRegister(new VerifyRegisterRequest { Email = "a@a.com", Code = "000000" });

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var msg = br.Value?.GetType().GetProperty("message")?.GetValue(br.Value)?.ToString();

            Assert.Equal("Mã OTP không đúng.", msg);

            auth.Verify(s => s.VerifyRegisterAsync(It.IsAny<VerifyRegisterRequest>(), "10.0.0.2"), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        #endregion

        #region ResendRegisterCode

        [Fact]
        public async Task ResendRegisterCode_ReturnsOk_WhenServiceSucceeds()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.ResendRegisterCodeAsync(It.IsAny<ResendRegisterCodeRequest>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            var controller = CreateController(auth);
            controller.ControllerContext.HttpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("127.0.0.1");

            var result = await controller.ResendRegisterCode(new ResendRegisterCodeRequest
            {
                Email = "a@a.com"
            });

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();

            Assert.Equal("Đã gửi lại mã OTP.", msg);

            auth.Verify(s => s.ResendRegisterCodeAsync(
                It.Is<ResendRegisterCodeRequest>(r => r.Email == "a@a.com"),
                It.Is<string>(ip => ip == "127.0.0.1")), Times.Once);

            auth.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task ResendRegisterCode_UsesUnknownIp_WhenRemoteIpNull()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.ResendRegisterCodeAsync(It.IsAny<ResendRegisterCodeRequest>(), "unknown"))
                .Returns(Task.CompletedTask);

            var controller = CreateController(auth);
            controller.ControllerContext.HttpContext.Connection.RemoteIpAddress = null;

            var result = await controller.ResendRegisterCode(new ResendRegisterCodeRequest { Email = "a@a.com" });

            Assert.IsType<OkObjectResult>(result);

            auth.Verify(s => s.ResendRegisterCodeAsync(It.IsAny<ResendRegisterCodeRequest>(), "unknown"), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task ResendRegisterCode_ReturnsBadRequest_WhenServiceThrowsArgumentException()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.ResendRegisterCodeAsync(It.IsAny<ResendRegisterCodeRequest>(), It.IsAny<string>()))
                .ThrowsAsync(new ArgumentException("1 email chỉ được gửi lại OTP sau 120 giây."));

            var controller = CreateController(auth);
            controller.ControllerContext.HttpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("10.0.0.3");

            var result = await controller.ResendRegisterCode(new ResendRegisterCodeRequest { Email = "a@a.com" });

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var msg = br.Value?.GetType().GetProperty("message")?.GetValue(br.Value)?.ToString();

            Assert.Equal("1 email chỉ được gửi lại OTP sau 120 giây.", msg);

            auth.Verify(s => s.ResendRegisterCodeAsync(It.IsAny<ResendRegisterCodeRequest>(), "10.0.0.3"), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        #endregion

        #region ForgotPassword additional

        [Fact]
        public async Task ForgotPassword_ReturnsBadRequest_WhenServiceThrowsArgumentException()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.ForgotPasswordAsync(It.IsAny<ForgotPasswordRequest>()))
                .ThrowsAsync(new ArgumentException("Không tìm thấy Email"));

            var controller = CreateController(auth);

            var result = await controller.ForgotPassword(new ForgotPasswordRequest { Email = "missing@a.com" });

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var msg = br.Value?.GetType().GetProperty("message")?.GetValue(br.Value)?.ToString();

            Assert.Equal("Không tìm thấy Email", msg);

            auth.Verify(s => s.ForgotPasswordAsync(It.Is<ForgotPasswordRequest>(r => r.Email == "missing@a.com")), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        #endregion

        #region ResetPassword additional

        [Fact]
        public async Task ResetPassword_ReturnsBadRequest_WhenServiceThrowsArgumentException()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.ResetPasswordAsync(It.IsAny<ResetPasswordRequest>()))
                .ThrowsAsync(new ArgumentException("Mật khẩu mới phải có ít nhất 8 kí tự"));

            var controller = CreateController(auth);

            var result = await controller.ResetPassword(new ResetPasswordRequest());

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var msg = br.Value?.GetType().GetProperty("message")?.GetValue(br.Value)?.ToString();

            Assert.Equal("Mật khẩu mới phải có ít nhất 8 kí tự", msg);

            auth.Verify(s => s.ResetPasswordAsync(It.IsAny<ResetPasswordRequest>()), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        #endregion

        #region ChangePassword additional

        [Fact]
        public async Task ChangePassword_UsesTokenEmail_WhenBothTokenAndBodyEmailProvided()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.ChangePasswordAsync("token@example.com", It.IsAny<ChangePasswordRequest>()))
                .Returns(Task.CompletedTask);

            var controller = CreateController(auth, emailInToken: "token@example.com");

            var result = await controller.ChangePassword(new ChangePasswordRequest
            {
                Email = "body@example.com",
                CurrentPassword = "Old12345",
                NewPassword = "New12345"
            });

            Assert.IsType<OkObjectResult>(result);

            auth.Verify(s => s.ChangePasswordAsync("token@example.com", It.IsAny<ChangePasswordRequest>()), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task ChangePassword_UsesBodyEmail_WhenNoTokenEmail()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.ChangePasswordAsync(null, It.IsAny<ChangePasswordRequest>()))
                .Returns(Task.CompletedTask);

            var controller = CreateController(auth, emailInToken: null);

            var result = await controller.ChangePassword(new ChangePasswordRequest
            {
                Email = null,
                CurrentPassword = "Old12345",
                NewPassword = "New12345"
            });

            Assert.IsType<OkObjectResult>(result);

            auth.Verify(s => s.ChangePasswordAsync(null, It.IsAny<ChangePasswordRequest>()), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task ChangePassword_ReturnsOk_WithSuccessMessage()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);

            auth.Setup(s => s.ChangePasswordAsync("cp@example.com", It.IsAny<ChangePasswordRequest>()))
                .Returns(Task.CompletedTask);

            var controller = CreateController(auth, emailInToken: "cp@example.com");

            var result = await controller.ChangePassword(new ChangePasswordRequest
            {
                CurrentPassword = "Old12345",
                NewPassword = "New12345"
            });

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();

            Assert.Equal("Thay đổi mật khẩu thành công", msg);

            auth.Verify(s => s.ChangePasswordAsync("cp@example.com", It.IsAny<ChangePasswordRequest>()), Times.Once);
            auth.VerifyNoOtherCalls();
        }

        #endregion

        #region Logout additional

        [Fact]
        public void Logout_DoesNotCallService()
        {
            var auth = new Mock<IAuthService>(MockBehavior.Strict);
            var controller = CreateController(auth);

            var result = controller.Logout();

            Assert.IsType<OkObjectResult>(result);
            auth.VerifyNoOtherCalls();
        }

        #endregion

    }
}
