using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Helpers;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Mail;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.IdentityModel.Tokens;

namespace SaoKim_ecommerce_BE.Services
{
    public class AuthService : IAuthService
    {
        private readonly SaoKimDBContext _context;
        private readonly IConfiguration _config;
        private readonly IPasswordResetService _resetService;
        private readonly IEmailService _emailService;

        public AuthService(
            SaoKimDBContext context,
            IConfiguration config,
            IPasswordResetService resetService,
            IEmailService emailService)
        {
            _context = context;
            _config = config;
            _resetService = resetService;
            _emailService = emailService;
        }

        public async Task<RegisterResponse> RegisterAsync(RegisterRequest req)
        {
            if (await _context.Users.AnyAsync(u => u.Email == req.Email))
                throw new ArgumentException("Email đã tồn tại");

            if (!AuthHelper.HasLetterAndDigit(req.Password))
                throw new ArgumentException("Mật khẩu phải có 1 chữ cái và 1 chữ số");

            var roleName = string.IsNullOrWhiteSpace(req.Role) ? "customer" : req.Role;
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
            if (role == null)
                throw new ArgumentException("Role not found");

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

            return new RegisterResponse
            {
                Message = "Register successful",
                Email = user.Email,
                Role = role.Name,
                Image = imagePath
            };
        }

        public async Task<LoginResponse> LoginAsync(LoginRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) && string.IsNullOrWhiteSpace(req.Password))
                throw new ArgumentException("Thông tin đăng nhập sai");

            if (string.IsNullOrWhiteSpace(req.Email))
                throw new ArgumentException("Vui lòng nhập email");

            if (string.IsNullOrWhiteSpace(req.Password))
                throw new ArgumentException("Vui lòng nhập mật khẩu");

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == req.Email);

            if (user == null)
                throw new UnauthorizedAccessException("Thông tin đăng nhập sai");

            if (!BCrypt.Net.BCrypt.Verify(req.Password, user.Password))
                throw new UnauthorizedAccessException("Thông tin đăng nhập sai");

            if (!string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
                throw new UnauthorizedAccessException("Tài khoản của bạn hiện đang bị tạm khoá. Vui lòng liên hệ hỗ trợ để kích hoạt lại.");

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

            return new LoginResponse
            {
                Token = tokenHandler.WriteToken(token),
                Email = user.Email,
                FullName = user.Name,
                Role = user.Role?.Name
            };
        }

        public async Task ForgotPasswordAsync(ForgotPasswordRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email))
                throw new ArgumentException("Vui lòng nhập Email");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
            if (user == null)
                throw new ArgumentException("Không tìm thấy Email");

            var ttl = TimeSpan.FromMinutes(5);
            var code = _resetService.GenerateCode(req.Email, ttl);

            var resetLink = $"http://localhost:5173/reset-password/{code}";

            var subject = "Đặt lại mật khẩu";
            var body = $@"
Xin chào {user.Email}!,
Chúng tôi nhận được yêu cầu đặt lại mật khẩu của bạn.
Vui lòng nhấn link bên dưới để đặt lại mật khẩu. Link này sẽ tồn tại trong {ttl.TotalMinutes} phút:
{resetLink}

Nếu không phải bạn, xin hãy liên lạc với chúng tôi. Vui lòng không đưa thiết bị của bạn cho bất kỳ ai!
";

            await _emailService.SendAsync(req.Email, subject, body);
        }

        public async Task ResetPasswordAsync(ResetPasswordRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.NewPassword))
                throw new ArgumentException("Missing data");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
            if (user == null)
                throw new ArgumentException("Không tìm thấy người dùng");

            if (req.NewPassword.Length < 8)
                throw new ArgumentException("Mật khẩu mới phải có ít nhất 8 kí tự");

            if (!AuthHelper.HasLetterAndDigit(req.NewPassword))
                throw new ArgumentException("Mật khẩu phải có 1 chữ cái và 1 chữ số");

            user.Password = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
            await _context.SaveChangesAsync();
        }

        public async Task ChangePasswordAsync(string? emailFromToken, ChangePasswordRequest req)
        {
            var email = string.IsNullOrWhiteSpace(emailFromToken) ? req.Email : emailFromToken;

            if (string.IsNullOrWhiteSpace(email))
                throw new ArgumentException("Vui lòng nhập Email");

            if (string.IsNullOrWhiteSpace(req.CurrentPassword) || string.IsNullOrWhiteSpace(req.NewPassword))
                throw new ArgumentException("Vui lòng nhập mật khẩu mới và mật khẩu cũ");

            if (req.NewPassword.Length < 8)
                throw new ArgumentException("Mật khẩu mới phải có ít nhất 8 kí tự");

            if (req.CurrentPassword == req.NewPassword)
                throw new ArgumentException("Mật khẩu mới không được giống với mật khẩu cũ");

            if (!AuthHelper.HasLetterAndDigit(req.NewPassword))
                throw new ArgumentException("Mật khẩu phải có 1 chữ cái và 1 chữ số");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
                throw new KeyNotFoundException("Không tìm thấy người dùng");

            var ok = BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.Password);
            if (!ok)
                throw new ArgumentException("Mật khẩu cũ không đúng");

            user.Password = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
            await _context.SaveChangesAsync();
        }
    }
}
