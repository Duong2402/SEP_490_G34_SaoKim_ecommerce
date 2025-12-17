using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Model.Requests;
using SaoKim_ecommerce_BE.Models.Requests;
using SaoKim_ecommerce_BE.Services;
using System;
using System.Threading.Tasks;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromForm] RegisterRequest req)
    {
        try
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _authService.RegisterAsync(req);

            return Ok(new
            {
                message = result.Message,
                email = result.Email,
                role = result.Role,
                image = result.Image
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Internal server error", detail = ex.Message });
        }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        try
        {
            var response = await _authService.LoginAsync(req);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            // Thiếu email / password
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            // Sai thông tin đăng nhập / tài khoản bị khóa
            return Unauthorized(new { message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        try
        {
            await _authService.ForgotPasswordAsync(req);
            return Ok(new { message = "Link đặt lại mật khẩu đã gửi đến email của bạn" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req)
    {
        try
        {
            await _authService.ResetPasswordAsync(req);
            return Ok(new { message = "Đặt lại mật khẩu thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST: /api/auth/change-password
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var emailFromToken = User?.Identity?.Name;

        try
        {
            await _authService.ChangePasswordAsync(emailFromToken, req);
            return Ok(new { message = "Thay đổi mật khẩu thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("verify-register")]
    public async Task<IActionResult> VerifyRegister([FromBody] VerifyRegisterRequest req)
    {
        try
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            await _authService.VerifyRegisterAsync(req, ip);
            return Ok(new { message = "Xác thực email thành công. Tài khoản đã được tạo." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("resend-register-code")]
    public async Task<IActionResult> ResendRegisterCode([FromBody] ResendRegisterCodeRequest req)
    {
        try
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            await _authService.ResendRegisterCodeAsync(req, ip);
            return Ok(new { message = "Đã gửi lại mã OTP." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        return Ok(new { message = "Đăng xuất thành công" });
    }
}
