using System.Text.Json;

namespace SaoKim_ecommerce_BE.Services.Ai
{
    public interface IGeminiAiClient
    {
        Task<JsonDocument> GenerateContentAsync(string model, object requestBody, CancellationToken ct);
    }
}
