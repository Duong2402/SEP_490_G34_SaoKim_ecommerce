using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<PaymentService> _logger;
        private readonly string _scriptUrl;
        private readonly string _targetAccount;

        public PaymentService(
            IHttpClientFactory httpClientFactory,
            ILogger<PaymentService> logger,
            IConfiguration config)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;

            _scriptUrl = config["VietQr:ScriptUrl"] ?? string.Empty;
            _targetAccount = config["VietQr:TargetAccount"] ?? string.Empty;
        }

        public async Task<VietQrCheckResultDto> CheckVietQrAsync(int amount, CancellationToken cancellationToken = default)
        {
            if (amount <= 0)
                throw new ArgumentException("Số tiền phải lớn hơn 0", nameof(amount));

            if (string.IsNullOrWhiteSpace(_scriptUrl))
                throw new InvalidOperationException("Chưa cấu hình VietQr:ScriptUrl");

            if (string.IsNullOrWhiteSpace(_targetAccount))
                throw new InvalidOperationException("Chưa cấu hình VietQr:TargetAccount");

            var client = _httpClientFactory.CreateClient();

            HttpResponseMessage response;
            try
            {
                response = await client.GetAsync(_scriptUrl, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gọi Google Apps Script VietQR");
                throw new InvalidOperationException("Không gọi được Apps Script", ex);
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("VietQR trả về HTTP {StatusCode}", response.StatusCode);
                throw new InvalidOperationException("Không gọi được Apps Script");
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(json);

            if (!doc.RootElement.TryGetProperty("data", out var dataElem) ||
                dataElem.ValueKind != JsonValueKind.Array)
            {
                _logger.LogWarning("VietQR: không tìm thấy mảng data trong response");
                return new VietQrCheckResultDto { Matched = false };
            }

            var targetAmount = amount;
            var matched = false;

            foreach (var row in dataElem.EnumerateArray())
            {
                if (!row.TryGetProperty("Số tài khoản", out var accProp) ||
                    !row.TryGetProperty("Giá trị", out var valueProp) ||
                    !row.TryGetProperty("Mô tả", out var descProp))
                {
                    continue;
                }

                var account = accProp.GetString();
                var value = valueProp.GetInt32();
                var desc = descProp.GetString()?.ToUpperInvariant() ?? "";

                if (account == _targetAccount &&
                    value == targetAmount &&
                    (desc.Contains("THANH TOAN") || desc.Contains("CHUYEN TIEN")))
                {
                    matched = true;
                    break;
                }
            }

            return new VietQrCheckResultDto { Matched = matched };
        }
    }
}
