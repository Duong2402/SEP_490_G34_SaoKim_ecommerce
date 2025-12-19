using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Helpers;
using SaoKim_ecommerce_BE.Model.Requests;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Services
{
    public class AuthService : IAuthService
    {
        private readonly SaoKimDBContext _context;
        private readonly IConfiguration _config;
        private readonly IPasswordResetService _resetService;
        private readonly IEmailService _emailService;
        private readonly IMemoryCache _cache;

        public AuthService(
            SaoKimDBContext context,
            IConfiguration config,
            IPasswordResetService resetService,
            IEmailService emailService,
            IMemoryCache cache)
        {
            _context = context;
            _config = config;
            _resetService = resetService;
            _emailService = emailService;
            _cache = cache;
        }

        private sealed class PendingRegister
        {
            public string Email { get; set; } = string.Empty;
            public string Name { get; set; } = string.Empty;
            public string PasswordHash { get; set; } = string.Empty;

            public int RoleId { get; set; }
            public string RoleName { get; set; } = string.Empty;

            public string? PhoneNumber { get; set; }
            public DateTime? DobUtc { get; set; }
            public string? ImagePath { get; set; }

            public string Code { get; set; } = string.Empty;
            public DateTime ExpiresAtUtc { get; set; }
            public int AttemptsLeft { get; set; } = 5;
        }

        private static string NormalizeEmail(string email)
            => (email ?? "").Trim().ToLower();

        private static string PendingKey(string email) => $"reg:pending:{email}";
        private static string CooldownKey(string email) => $"reg:cooldown:{email}";
        private static string IpKey(string ip) => $"reg:ip:{ip}";

        private void EnforceIpLimit(string ip)
        {
            ip = string.IsNullOrWhiteSpace(ip) ? "unknown" : ip.Trim();

            var key = IpKey(ip);
            var count = _cache.TryGetValue(key, out int current) ? current : 0;

            if (count >= 5)
                throw new ArgumentException("1 IP chỉ được tối đa 5 lần / 10 phút.");

            _cache.Set(key, count + 1, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            });
        }

        private void EnforceCooldown(string email)
        {
            var key = CooldownKey(email);

            if (_cache.TryGetValue(key, out _))
                throw new ArgumentException("1 email chỉ được gửi lại OTP sau 120 giây.");

            _cache.Set(key, 1, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(120)
            });
        }

        private static string GenerateOtp6()
            => Random.Shared.Next(100000, 999999).ToString();

        private static void TryDeleteFile(string? relativePath)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(relativePath)) return;

                var p = relativePath.Trim();
                if (p.StartsWith("/")) p = p.Substring(1);

                var full = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", p.Replace("/", Path.DirectorySeparatorChar.ToString()));
                if (File.Exists(full)) File.Delete(full);
            }
            catch
            {
            }
        }

        private async Task<string?> SaveImageIfAnyAsync(RegisterRequest req)
        {
            if (req.Image == null || req.Image.Length <= 0) return null;

            var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(uploadDir))
                Directory.CreateDirectory(uploadDir);

            var fileName = $"{Guid.NewGuid()}_{req.Image.FileName}";
            var filePath = Path.Combine(uploadDir, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await req.Image.CopyToAsync(stream);
            }

            return $"/uploads/{fileName}";
        }

        public async Task<RegisterResponse> RegisterAsync(RegisterRequest req)
        {
            var email = NormalizeEmail(req.Email);
            if (string.IsNullOrWhiteSpace(email))
                throw new ArgumentException("Vui lòng nhập email");

            if (await _context.Users.AsNoTracking().AnyAsync(u => u.Email.ToLower() == email))
                throw new ArgumentException("Email đã tồn tại");

            if (!AuthHelper.HasLetterAndDigit(req.Password))
                throw new ArgumentException("Mật khẩu phải có 1 chữ cái và 1 chữ số");

            var roleName = string.IsNullOrWhiteSpace(req.Role) ? "customer" : req.Role.Trim().ToLower();
            var role = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Name.ToLower() == roleName);
            if (role == null)
                throw new ArgumentException("Role not found");

            var phone = (req.PhoneNumber ?? "").Trim();
            if (string.IsNullOrWhiteSpace(phone))
                throw new ArgumentException("Số điện thoại là bắt buộc.");
            if (!System.Text.RegularExpressions.Regex.IsMatch(phone, @"^0\d{8,10}$"))
                throw new ArgumentException("Số điện thoại phải bắt đầu bằng 0 và có 9-11 chữ số.");

            EnforceCooldown(email);
            
            string? imagePath = await SaveImageIfAnyAsync(req);

            var pending = new PendingRegister
            {
                Email = email,
                Name = req.Name,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),

                RoleId = role.RoleId,
                RoleName = role.Name,

                PhoneNumber = phone,
                DobUtc = req.DOB.HasValue ? DateTime.SpecifyKind(req.DOB.Value, DateTimeKind.Utc) : (DateTime?)null,
                ImagePath = imagePath,

                Code = GenerateOtp6(),
                ExpiresAtUtc = DateTime.UtcNow.AddMinutes(5),
                AttemptsLeft = 5
            };

            _cache.Set(PendingKey(email), pending, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
            });

            await _emailService.SendAsync(email, "Mã xác thực đăng ký", $"Mã của bạn: {pending.Code}");

            return new RegisterResponse
            {
                Message = "Đã gửi OTP về email. Vui lòng xác thực để hoàn tất đăng ký.",
                Email = pending.Email,
                Role = pending.RoleName,
                Image = pending.ImagePath
            };
        }

        public async Task ResendRegisterCodeAsync(ResendRegisterCodeRequest req, string clientIp)
        {
            EnforceIpLimit(clientIp);

            var email = NormalizeEmail(req.Email);
            if (string.IsNullOrWhiteSpace(email))
                throw new ArgumentException("Vui lòng nhập email");

            EnforceCooldown(email);

            var key = PendingKey(email);

            if (!_cache.TryGetValue(key, out PendingRegister? pending) || pending == null)
                throw new ArgumentException("Không có đăng ký tạm hoặc đã hết hạn.");

            if (pending.ExpiresAtUtc < DateTime.UtcNow)
            {
                _cache.Remove(key);
                TryDeleteFile(pending.ImagePath);
                throw new ArgumentException("Đăng ký tạm đã hết hạn, vui lòng đăng ký lại.");
            }

            pending.Code = GenerateOtp6();

            var ttlLeft = pending.ExpiresAtUtc - DateTime.UtcNow;
            if (ttlLeft < TimeSpan.FromSeconds(1)) ttlLeft = TimeSpan.FromSeconds(1);

            _cache.Set(key, pending, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ttlLeft
            });

            await _emailService.SendAsync(email, "Mã xác thực đăng ký", $"Mã của bạn: {pending.Code}");
        }

        public async Task VerifyRegisterAsync(VerifyRegisterRequest req, string clientIp)
        {
            EnforceIpLimit(clientIp);

            var email = NormalizeEmail(req.Email);
            var code = (req.Code ?? "").Trim();

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(code))
                throw new ArgumentException("Thiếu email hoặc mã OTP");

            var key = PendingKey(email);

            if (!_cache.TryGetValue(key, out PendingRegister? pending) || pending == null)
                throw new ArgumentException("Mã đã hết hạn hoặc không tồn tại.");

            if (pending.ExpiresAtUtc < DateTime.UtcNow)
            {
                _cache.Remove(key);
                TryDeleteFile(pending.ImagePath);
                throw new ArgumentException("Mã đã hết hạn.");
            }

            if (!string.Equals(pending.Code, code, StringComparison.Ordinal))
            {
                pending.AttemptsLeft--;

                if (pending.AttemptsLeft <= 0)
                {
                    _cache.Remove(key);
                    TryDeleteFile(pending.ImagePath);
                    throw new ArgumentException("Bạn đã nhập sai quá 5 lần. Đăng ký tạm đã bị khóa.");
                }

                var ttlLeft = pending.ExpiresAtUtc - DateTime.UtcNow;
                if (ttlLeft < TimeSpan.FromSeconds(1)) ttlLeft = TimeSpan.FromSeconds(1);

                _cache.Set(key, pending, new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = ttlLeft
                });

                throw new ArgumentException("Mã OTP không đúng.");
            }

            if (await _context.Users.AsNoTracking().AnyAsync(u => u.Email.ToLower() == email))
            {
                _cache.Remove(key);
                throw new ArgumentException("Email đã tồn tại.");
            }

            var user = new User
            {
                Name = pending.Name,
                Email = pending.Email,
                Password = pending.PasswordHash,
                RoleId = pending.RoleId,
                PhoneNumber = pending.PhoneNumber,
                DOB = pending.DobUtc,
                Image = pending.ImagePath,
                Status = "Active",
                CreateAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _cache.Remove(key);
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
                Expires = DateTime.UtcNow.AddHours(3),
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

            var feBase = _config["App:FrontendBaseUrl"];
            if (string.IsNullOrWhiteSpace(feBase))
                throw new InvalidOperationException("Missing configuration App:FrontendBaseUrl");

            feBase = feBase.Trim().TrimEnd('/');

            var resetLink = $"{feBase}/reset-password/{code}";

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
