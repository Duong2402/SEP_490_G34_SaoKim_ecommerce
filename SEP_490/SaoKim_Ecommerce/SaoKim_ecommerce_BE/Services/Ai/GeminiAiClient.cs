using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace SaoKim_ecommerce_BE.Services.Ai
{
    public class GeminiAiClient : IGeminiAiClient
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;

        public GeminiAiClient(IHttpClientFactory httpClientFactory, IConfiguration config)
        {
            _httpClientFactory = httpClientFactory;
            _config = config;
        }

        public async Task<JsonDocument> GenerateContentAsync(string model, object requestBody, CancellationToken ct)
        {
            var apiKey = _config["Gemini:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("Missing Gemini:ApiKey. Set it via User Secrets or environment variables.");

            var timeoutSeconds = int.TryParse(_config["Gemini:TimeoutSeconds"], out var t) ? t : 30;

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

            var http = _httpClientFactory.CreateClient();
            http.Timeout = TimeSpan.FromSeconds(timeoutSeconds);

            using var req = new HttpRequestMessage(HttpMethod.Post, url);
            req.Headers.Add("x-goog-api-key", apiKey);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var json = JsonSerializer.Serialize(requestBody);
            req.Content = new StringContent(json, Encoding.UTF8, "application/json");

            using var resp = await http.SendAsync(req, ct);
            var body = await resp.Content.ReadAsStringAsync(ct);

            if (!resp.IsSuccessStatusCode)
                throw new InvalidOperationException($"Gemini API error: {(int)resp.StatusCode} - {body}");

            return JsonDocument.Parse(body);
        }
    }
}
