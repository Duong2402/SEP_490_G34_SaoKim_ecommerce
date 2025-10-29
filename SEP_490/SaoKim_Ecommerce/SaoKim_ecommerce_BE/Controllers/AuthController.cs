
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
[Route("api/[controller]")]
[ApiController]
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
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (await _context.Users.AnyAsync(u => u.Email == req.Email))
            return BadRequest(new { message = "Email already exists" });

        string hashedPassword = BCrypt.Net.BCrypt.HashPassword(req.Password);

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == (req.Role ?? "User"));
        if (role == null)
            return BadRequest(new { message = "Role not found" });

        var user = new User
        {
            Name = req.Name,
            Email = req.Email,
            Password = hashedPassword,
            RoleId = role.RoleId,
            Status = "Active",
            CreateAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Register successful", Email = user.Email, Role = role.Name });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
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
            Subject = new ClaimsIdentity(new Claim[]
            {
            new Claim(ClaimTypes.Name, user.Email),
            new Claim("UserId", user.UserID.ToString()),
            new Claim(ClaimTypes.Role, user.Role?.Name ?? "")
            }),
            Expires = DateTime.UtcNow.AddHours(2),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
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
        if (string.IsNullOrWhiteSpace(req.Email)) return BadRequest(new { message = "Email required" });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user == null) return BadRequest(new { message = "Email not found" });

        var ttl = TimeSpan.FromMinutes(5);
        var code = resetService.GenerateCode(req.Email, ttl);

        var subject = "Your password reset code";
        var body = $"Your verification code is: {code}. It will expire in {ttl.TotalMinutes} minutes.";
        await emailService.SendAsync(req.Email, subject, body);

        return Ok(new { message = "Verification code has been sent to your email." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req,
        [FromServices] IPasswordResetService resetService)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Code) || string.IsNullOrWhiteSpace(req.NewPassword))
            return BadRequest(new { message = "Missing data" });

        var verified = resetService.VerifyCode(req.Email, req.Code);
        if (!verified) return BadRequest(new { message = "Invalid or expired code" });

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
