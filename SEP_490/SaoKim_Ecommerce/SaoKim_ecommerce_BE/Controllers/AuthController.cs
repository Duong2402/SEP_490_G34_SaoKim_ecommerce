
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]

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
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        if (await _context.Users.AnyAsync(u => u.Email == req.Email))
        {
            ModelState.AddModelError("Email", "Email already exists");
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


    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) && string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Invalid email or password" });

        if (string.IsNullOrWhiteSpace(req.Email))
            return BadRequest(new { message = "Please enter your email" });

        if (string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Please enter your password" });

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == req.Email);

        if (user == null)
            return Unauthorized(new { message = "Invalid email or password" });

        if (!BCrypt.Net.BCrypt.Verify(req.Password, user.Password))
            return Unauthorized(new { message = "Invalid email or password" });

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_config["Jwt:Key"]);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
            new Claim(ClaimTypes.Name, user.Email),
            new Claim("UserId", user.UserID.ToString()),
            new Claim(ClaimTypes.Role, user.Role?.Name ?? "")
        }),
            Expires = DateTime.UtcNow.AddHours(2),
            Issuer = _config["Jwt:Issuer"],
            Audience = _config["Jwt:Audience"],
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


    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req,
        [FromServices] IPasswordResetService resetService,
        [FromServices] IEmailService emailService)
    {
        if (string.IsNullOrWhiteSpace(req.Email))
            return BadRequest(new { message = "Email required" });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user == null)
            return BadRequest(new { message = "Email not found" });

        var ttl = TimeSpan.FromMinutes(5);
        var code = resetService.GenerateCode(req.Email, ttl);

        var resetLink = $"http://localhost:5173/reset-password/{code}";

        var subject = "Reset your password";
        var body = $@"
        Hi {user.Email},
        Click the link below to reset your password. This link will expire in {ttl.TotalMinutes} minutes: {resetLink}
        If you didn't request this, you can safely ignore this email.
    ";
        await emailService.SendAsync(req.Email, subject, body);
        return Ok(new { message = "Password reset link has been sent to your email." });
    }


    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req,
        [FromServices] IPasswordResetService resetService)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.NewPassword))
            return BadRequest(new { message = "Missing data" });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user == null) return BadRequest(new { message = "User not found" });

        user.Password = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Password reset successful" });
    }


    [HttpPost("logout")]
    public IActionResult Logout()
    {
        return Ok(new { message = "Logged out" });
    }
}
