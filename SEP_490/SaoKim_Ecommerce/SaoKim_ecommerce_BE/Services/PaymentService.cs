using System.Net.Http;
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

        public async Task<VietQrCheckResultDto> CheckVietQrAsync(
            int amount,
            string? paymentToken = null,
            CancellationToken cancellationToken = default)
        {
            var result = new VietQrCheckResultDto
            {
                Matched = false,
                Amount = amount,
                PaymentToken = paymentToken,
                Source = "AppsScript"
            };

            if (amount <= 0)
            {
                result.Error = "Số tiền phải lớn hơn 0";
                return result;
            }

            if (string.IsNullOrWhiteSpace(_scriptUrl))
            {
                result.Error = "Chưa cấu hình VietQr:ScriptUrl";
                return result;
            }

            if (string.IsNullOrWhiteSpace(_targetAccount))
            {
                result.Error = "Chưa cấu hình VietQr:TargetAccount";
                return result;
            }

            var client = _httpClientFactory.CreateClient();

            HttpResponseMessage response;
            string body;

            try
            {
                response = await client.GetAsync(_scriptUrl, cancellationToken);
                body = await response.Content.ReadAsStringAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gọi Apps Script VietQR");
                result.Error = "Không gọi được Apps Script";
                return result;
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("VietQR trả về HTTP {StatusCode}. Body: {Body}", response.StatusCode, body);
                result.Error = "Apps Script trả lỗi HTTP";
                return result;
            }

            JsonElement dataElem;
            try
            {
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                if (root.ValueKind == JsonValueKind.Array)
                {
                    dataElem = root.Clone();
                }
                else if (root.TryGetProperty("data", out var d) && d.ValueKind == JsonValueKind.Array)
                {
                    dataElem = d.Clone();
                }
                else
                {
                    result.Error = "Apps Script JSON không có mảng data";
                    return result;
                }
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Apps Script không trả JSON. Body: {Body}", body);
                result.Error = "Apps Script không trả JSON (đang trả HTML). Kiểm tra Deploy Web App / quyền truy cập.";
                return result;
            }

            var targetAcc = NormalizeAccount(_targetAccount);
            var tokenUpper = (paymentToken ?? string.Empty).Trim().ToUpperInvariant();

            foreach (var row in dataElem.EnumerateArray())
            {
                string? accRaw = null;

                if (!TryGetString(row, "Số tài khoản", out accRaw) || string.IsNullOrWhiteSpace(accRaw))
                {
                    TryGetString(row, "Số tài khoản đối ứng", out accRaw);
                }

                if (string.IsNullOrWhiteSpace(accRaw))
                    continue;

                if (!TryGetIntVnd(row, "Giá trị", out var value))
                    continue;

                TryGetString(row, "Mô tả", out var descRaw);
                descRaw ??= string.Empty;

                TryGetString(row, "Mã GD", out var txnId);

                var acc = NormalizeAccount(accRaw);
                var descUpper = descRaw.ToUpperInvariant();

                var descMatchBasic =
                    descUpper.Contains("THANH TOAN") ||
                    descUpper.Contains("CHUYEN TIEN");

                var descMatchToken = string.IsNullOrEmpty(tokenUpper)
                    ? true
                    : descUpper.Contains(tokenUpper);

                if (acc == targetAcc &&
                    value == amount &&
                    descMatchBasic &&
                    descMatchToken)
                {
                    result.Matched = true;
                    result.MatchedTxnId = txnId;
                    result.MatchedDesc = descRaw;
                    result.Error = null;
                    return result;
                }
            }

            return result;
        }

        private static string NormalizeAccount(string s)
        {
            s = (s ?? string.Empty).Trim();
            return s.Replace(" ", "").Replace("-", "");
        }

        private static bool TryGetString(JsonElement obj, string prop, out string? value)
        {
            value = null;
            if (!obj.TryGetProperty(prop, out var el)) return false;

            if (el.ValueKind == JsonValueKind.String)
            {
                value = el.GetString();
                return true;
            }

            value = el.ToString();
            return true;
        }

        private static bool TryGetIntVnd(JsonElement obj, string prop, out int value)
        {
            value = 0;
            if (!obj.TryGetProperty(prop, out var el)) return false;

            if (el.ValueKind == JsonValueKind.Number)
                return el.TryGetInt32(out value);

            if (el.ValueKind == JsonValueKind.String)
            {
                var s = (el.GetString() ?? string.Empty).Trim();
                if (s.Length == 0) return false;

                s = s.Replace(".", "").Replace(",", "").Replace(" ", "");
                return int.TryParse(s, out value);
            }

            return false;
        }
    }
}
