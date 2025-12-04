using DocumentFormat.OpenXml.Bibliography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Helpers;
using SaoKim_ecommerce_BE.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

[ApiController]
[Route("api/[controller]")]
[Authorize]

public class AuthController : ControllerBase
{
    private readonly SaoKimDBContext _context;
    private readonly IConfiguration _config;

    public AuthController(SaoKimDBContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromForm] RegisterRequest req)
    {
        try
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            if (await _context.Users.AnyAsync(u => u.Email == req.Email))
            {
                ModelState.AddModelError("Email", "Email already exists");
                return ValidationProblem(ModelState);
            }
            if (!AuthHelper.HasLetterAndDigit(req.Password))
            {
                ModelState.AddModelError("Password", "Mật khẩu phải có 1 chữ cái và 1 chữ số");
                return ValidationProblem(ModelState);
            }

            var roleName = string.IsNullOrWhiteSpace(req.Role) ? "customer" : req.Role;
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
            if (role == null)
            {
                ModelState.AddModelError("Role", "Role not found");
                return ValidationProblem(ModelState);
            }

            string? imagePath = null;
            if (req.Image != null && req.Image.Length > 0)
            {
                var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(uploadDir))
                    Directory.CreateDirectory(uploadDir);

                var fileName = $"{Guid.NewGuid()}_{req.Image.FileName}";
                var filePath = Path.Combine(uploadDir, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await req.Image.CopyToAsync(stream);
                }

                imagePath = $"/uploads/{fileName}";
            }

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(req.Password);

            var user = new User
            {
                Name = req.Name,
                Email = req.Email,
                Password = hashedPassword,
                RoleId = role.RoleId,
                PhoneNumber = req.PhoneNumber,
                DOB = req.DOB.HasValue
                    ? DateTime.SpecifyKind(req.DOB.Value, DateTimeKind.Utc)
                    : (DateTime?)null,
                Image = imagePath,
                Status = "Active",
                CreateAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Register successful",
                email = user.Email,
                role = role.Name,
                image = imagePath
            });
        }
        catch (Exception ex)
        {
            // dùng ILogger<AuthController> _logger để log cho chuẩn
            // _logger.LogError(ex, "Register error");

            return StatusCode(500, new { message = "Internal server error", detail = ex.Message });
        }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) && string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Thông tin đăng nhập sai" });

        if (string.IsNullOrWhiteSpace(req.Email))
            return BadRequest(new { message = "Vui lòng nhập email" });

        if (string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Vui lòng nhập mật khẩu" });

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == req.Email);

        if (user == null)
            return Unauthorized(new { message = "Thông tin đăng nhập sai" });

        if (!BCrypt.Net.BCrypt.Verify(req.Password, user.Password))
            return Unauthorized(new { message = "Thông tin đăng nhập sai" });

        if (!string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
            return Unauthorized(new { message = "Tài khoản của bạn hiện đang bị tạm khoá. Vui lòng liên hệ hỗ trợ để kích hoạt lại." });

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_config["Jwt:Key"]);
        var issuer = _config["Jwt:Issuer"];
        var audience = _config["Jwt:Audience"];

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
            new Claim(ClaimTypes.Name, user.Email),
            new Claim("UserId", user.UserID.ToString()),
            new Claim(ClaimTypes.Role, user.Role?.Name ?? "")
        }),
            Expires = DateTime.UtcNow.AddHours(1),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);

        return Ok(new LoginResponse
        {
            Token = tokenHandler.WriteToken(token),
            Email = user.Email,
            FullName = user.Name,
            Role = user.Role?.Name
        });
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req,
        [FromServices] IPasswordResetService resetService,
        [FromServices] IEmailService emailService)
    {
        if (string.IsNullOrWhiteSpace(req.Email))
            return BadRequest(new { message = "Vui lòng nhập Email" });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user == null)
            return BadRequest(new { message = "Không tìm thấy Email" });

        var ttl = TimeSpan.FromMinutes(5);
        var code = resetService.GenerateCode(req.Email, ttl);

        var resetLink = $"http://localhost:5173/reset-password/{code}";

        var subject = "Đặt lại mật khẩu";
        var body = $@"
        Xin chào {user.Email} !,
        Chúng tôi nhận được yêu cầu đặt lại mật khẩu của bạn
        Vui lòng nhấn link bên dưới để đặt lại mật khẩu. Link này sẽ tồn tại trong {ttl.TotalMinutes} phút: {resetLink}
        Nếu không phải bạn xin hãy liên lạc với chúng tôi. Vui lòng không đưa thiết bị của bạn cho bất kỳ ai!
    ";
        await emailService.SendAsync(req.Email, subject, body);
        return Ok(new { message = "Link đặt lại mật khẩu đã gửi đến email của bạn" });
    }


    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req,
        [FromServices] IPasswordResetService resetService)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.NewPassword))
            return BadRequest(new { message = "Missing data" });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user == null) return BadRequest(new { message = "Không tìm thấy người dùng" });

        if (req.NewPassword.Length < 8)
            return BadRequest(new { message = "Mật khẩu mới phải có ít nhất 8 kí tự" });

        if (!AuthHelper.HasLetterAndDigit(req.NewPassword))
        {
            ModelState.AddModelError("Password", "Mật khẩu phải có 1 chữ cái và 1 chữ số");
            return ValidationProblem(ModelState);
        }

        user.Password = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đặt lại mật khẩu thành công" });
    }

    // POST: /api/auth/change-password
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var emailFromToken = User?.Identity?.Name;
        var email = string.IsNullOrWhiteSpace(emailFromToken) ? req.Email : emailFromToken;

        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Vui lòng nhập Email" });

        if (string.IsNullOrWhiteSpace(req.CurrentPassword) || string.IsNullOrWhiteSpace(req.NewPassword))
            return BadRequest(new { message = "Vui lòng nhập mật khẩu mới và mật khẩu cũ" });

        if (req.NewPassword.Length < 8) 
            return BadRequest(new { message = "Mật khẩu mới phải có ít nhất 8 kí tự" });

        if (req.CurrentPassword == req.NewPassword)
            return BadRequest(new { message = "Mật khẩu mới không được giống với mật khẩu cũ" });

        if (!AuthHelper.HasLetterAndDigit(req.NewPassword))
        {
            ModelState.AddModelError("Password", "Mật khẩu phải có 1 chữ cái và 1 chữ số");
            return ValidationProblem(ModelState);
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
            return NotFound(new { message = "Không tìm thấy người dùng" });

        var ok = BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.Password);
        if (!ok)
            return BadRequest(new { message = "Mật khẩu cũ không đúng" });

        user.Password = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Thay đổi mật khẩu thành ông" });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        return Ok(new { message = "Đăng xuất thành công" });
    }
}
