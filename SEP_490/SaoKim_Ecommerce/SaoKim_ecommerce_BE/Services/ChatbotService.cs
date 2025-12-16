using System.Text.Json;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Services.Ai;
using SaoKim_ecommerce_BE.Services.ChatbotTools;

namespace SaoKim_ecommerce_BE.Services
{
    public class ChatbotService : IChatbotService
    {
        private readonly IGeminiAiClient _gemini;
        private readonly IChatbotToolService _tools;
        private readonly IConfiguration _config;

        public ChatbotService(IGeminiAiClient gemini, IChatbotToolService tools, IConfiguration config)
        {
            _gemini = gemini;
            _tools = tools;
            _config = config;
        }

        public async Task<ChatOrchestratorResult> HandleMessageAsync(string baseUrl, ChatRequestDto req, CancellationToken ct)
        {
            var model = _config["Gemini:Model"] ?? "gemini-2.5-flash";
            var message = (req.Message ?? "").Trim();

            if (message.Length == 0)
            {
                return new ChatOrchestratorResult
                {
                    FinalText = "Bạn hãy nhập nhu cầu của bạn, ví dụ: “Gợi ý đèn LED dưới 500k”, “Tìm đèn âm trần”, hoặc “Sản phẩm tương tự”.",
                    QuickReplies = BuildQuickReplies(req),
                    Products = new List<ChatProductCardDto>()
                };
            }

            var functionDeclarations = BuildFunctionDeclarations();

            // Request 1: user -> model (model có thể trả functionCall)
            var request1 = new
            {
                contents = new object[]
                {
                    new {
                        role = "user",
                        parts = new object[] { new { text = BuildPrompt(req, message) } }
                    }
                },
                tools = new object[]
                {
                    new { functionDeclarations }
                }
            };

            using var resp1 = await _gemini.GenerateContentAsync(model, request1, ct);

            var (fnName, fnArgs) = TryExtractFunctionCall(resp1);

            // Nếu model không gọi tool: lấy text trả về luôn
            if (string.IsNullOrWhiteSpace(fnName))
            {
                var t = TryExtractText(resp1);
                return new ChatOrchestratorResult
                {
                    FinalText = string.IsNullOrWhiteSpace(t)
                        ? "Mình chưa hiểu rõ. Bạn muốn tìm theo tên, theo mã hay theo khoảng giá?"
                        : t,
                    QuickReplies = BuildQuickReplies(req),
                    Products = new List<ChatProductCardDto>()
                };
            }

            // Execute tool
            List<ChatProductCardDto> products;

            if (fnName == "get_similar_products")
            {
                var pid = GetInt(fnArgs, "productId") ?? req.Context?.ProductId;
                var limit = GetInt(fnArgs, "limit") ?? 8;

                if (!pid.HasValue)
                {
                    products = new List<ChatProductCardDto>();
                }
                else
                {
                    products = await _tools.GetSimilarProductsAsync(baseUrl, pid.Value, limit);
                }
            }
            else
            {
                var keyword = GetString(fnArgs, "keyword") ?? message;
                var categoryId = GetInt(fnArgs, "categoryId") ?? req.Context?.CategoryId;
                var priceMin = GetDecimal(fnArgs, "priceMin") ?? req.Context?.PriceMin;
                var priceMax = GetDecimal(fnArgs, "priceMax") ?? req.Context?.PriceMax;

                // InStockOnly: ưu tiên args, fallback context, cuối cùng default true
                var inStockOnly = GetBool(fnArgs, "inStockOnly") ?? req.Context?.InStockOnly ?? true;

                var limit = GetInt(fnArgs, "limit") ?? 8;

                products = await _tools.SearchProductsAsync(baseUrl, keyword, categoryId, priceMin, priceMax, inStockOnly, limit);
            }

            // Request 2: phải đúng thứ tự user -> model(functionCall) -> user(functionResponse)
            var request2 = new
            {
                contents = new object[]
                {
                    // user turn ban đầu (bắt buộc phải có)
                    new {
                        role = "user",
                        parts = new object[] { new { text = BuildPrompt(req, message) } }
                    },

                    // model turn có functionCall (lấy từ resp1)
                    GetCandidateContent(resp1),

                    // functionResponse phải ngay sau functionCall
                    new {
                        role = "user",
                        parts = new object[]
                        {
                            new {
                                functionResponse = new {
                                    name = fnName,
                                    response = new { result = products }
                                }
                            }
                        }
                    }
                },
                tools = new object[]
                {
                    new { functionDeclarations }
                }
            };

            using var resp2 = await _gemini.GenerateContentAsync(model, request2, ct);
            var finalText = (TryExtractText(resp2) ?? "").Trim();

            // CHỐT THEO SỰ THẬT để không bị "nói không có nhưng vẫn show sản phẩm"
            finalText = NormalizeFinalTextByProducts(finalText, products);

            return new ChatOrchestratorResult
            {
                FinalText = finalText,
                Products = products ?? new List<ChatProductCardDto>(),
                QuickReplies = BuildQuickReplies(req)
            };
        }

        private static string NormalizeFinalTextByProducts(string finalText, List<ChatProductCardDto> products)
        {
            products ??= new List<ChatProductCardDto>();
            var hasProducts = products.Count > 0;

            if (string.IsNullOrWhiteSpace(finalText))
            {
                return hasProducts
                    ? "Mình đã tìm được một số sản phẩm phù hợp. Bạn xem danh sách gợi ý bên dưới nhé."
                    : "Hiện tại mình chưa tìm được sản phẩm phù hợp trong hệ thống. Bạn cho mình biết thêm ngân sách và không gian sử dụng để mình tư vấn chính xác hơn nhé.";
            }

            if (!hasProducts) return finalText;

            // Nếu có products mà AI lại nói không có -> override
            var lower = finalText.ToLowerInvariant();
            var contradict =
                lower.Contains("chưa tìm") ||
                lower.Contains("không tìm") ||
                lower.Contains("không có sản phẩm") ||
                lower.Contains("không có sản phẩm nào") ||
                lower.Contains("hiện tại không có") ||
                lower.Contains("không có trong hệ thống");

            if (contradict)
            {
                return "Mình đã tìm được một số sản phẩm phù hợp. Bạn xem danh sách gợi ý bên dưới nhé.";
            }

            return finalText;
        }

        private static object[] BuildFunctionDeclarations()
        {
            return new object[]
            {
                new {
                    name = "search_products",
                    description = "Tìm sản phẩm trong database theo keyword, category, khoảng giá và điều kiện còn hàng.",
                    parameters = new {
                        type = "object",
                        properties = new {
                            keyword = new { type = "string", description = "Từ khóa: tên/mã/mô tả/nhà cung cấp." },
                            categoryId = new { type = "integer", description = "ID danh mục (nếu có)." },
                            priceMin = new { type = "number", description = "Giá tối thiểu (nếu có)." },
                            priceMax = new { type = "number", description = "Giá tối đa (nếu có)." },
                            inStockOnly = new { type = "boolean", description = "Chỉ lấy sản phẩm còn hàng." },
                            limit = new { type = "integer", description = "Số lượng sản phẩm trả về (1-12)." }
                        },
                        required = new string[] { }
                    }
                },
                new {
                    name = "get_similar_products",
                    description = "Lấy sản phẩm tương tự dựa trên category của sản phẩm hiện tại.",
                    parameters = new {
                        type = "object",
                        properties = new {
                            productId = new { type = "integer", description = "ID sản phẩm gốc." },
                            limit = new { type = "integer", description = "Số lượng sản phẩm trả về (1-12)." }
                        },
                        required = new [] { "productId" }
                    }
                }
            };
        }

        private static string BuildPrompt(ChatRequestDto req, string message)
        {
            var ctx = req.Context ?? new ChatContextDto();

            return
$@"Bạn là trợ lý tư vấn mua sắm của hệ thống Sao Kim.
Yêu cầu:
- Trò chuyện tự nhiên, lịch sự như nhân viên tư vấn.
- Chỉ gợi ý sản phẩm có trong hệ thống, không bịa.
- Khi cần danh sách sản phẩm, bắt buộc gọi công cụ (function) phù hợp.
- BẮT BUỘC dựa vào kết quả functionResponse:
  + Nếu result có phần tử: phải nói là đã tìm thấy sản phẩm và giới thiệu ngắn gọn.
  + Nếu result rỗng: phải nói chưa tìm thấy sản phẩm phù hợp và hỏi thêm 1-2 câu để làm rõ nhu cầu.
- Trả lời ngắn gọn, tối đa khoảng 4-6 câu.

Ngữ cảnh:
- Page: {ctx.Page}
- ProductId: {ctx.ProductId}
- CategoryId: {ctx.CategoryId}
- PriceMin: {ctx.PriceMin}
- PriceMax: {ctx.PriceMax}
- InStockOnly: {ctx.InStockOnly}

Người dùng: {message}

Gợi ý công cụ:
- Nếu người dùng hỏi tương tự/liên quan và có ProductId, gọi get_similar_products(productId, limit=8)
- Nếu người dùng muốn tìm/gợi ý theo tên/mã/khoảng giá/còn hàng, gọi search_products(keyword, categoryId, priceMin, priceMax, inStockOnly=true, limit=8)";
        }

        private static List<string> BuildQuickReplies(ChatRequestDto req)
        {
            var list = new List<string>
            {
                "Gợi ý đèn dưới 500k",
                "Tìm sản phẩm còn hàng",
                "Sản phẩm tương tự"
            };

            if (req.Context?.ProductId != null)
                list.Insert(0, "Gợi ý sản phẩm liên quan");

            return list;
        }

        private static (string? name, Dictionary<string, object?> args) TryExtractFunctionCall(JsonDocument doc)
        {
            try
            {
                var root = doc.RootElement;

                if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
                    return (null, new Dictionary<string, object?>());

                var parts = candidates[0].GetProperty("content").GetProperty("parts");
                foreach (var part in parts.EnumerateArray())
                {
                    if (part.TryGetProperty("functionCall", out var fc) || part.TryGetProperty("function_call", out fc))
                    {
                        var name = fc.GetProperty("name").GetString();
                        var args = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

                        if (fc.TryGetProperty("args", out var argsEl) && argsEl.ValueKind == JsonValueKind.Object)
                        {
                            foreach (var p in argsEl.EnumerateObject())
                                args[p.Name] = ToObject(p.Value);
                        }

                        return (name, args);
                    }
                }
            }
            catch { }

            return (null, new Dictionary<string, object?>());
        }

        private static object GetCandidateContent(JsonDocument doc)
        {
            var root = doc.RootElement;
            var c0 = root.GetProperty("candidates")[0];
            var content = c0.GetProperty("content");
            return JsonSerializer.Deserialize<object>(content.GetRawText())!;
        }

        private static string? TryExtractText(JsonDocument doc)
        {
            try
            {
                var root = doc.RootElement;

                if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
                    return null;

                var parts = candidates[0].GetProperty("content").GetProperty("parts");
                foreach (var part in parts.EnumerateArray())
                {
                    if (part.TryGetProperty("text", out var t))
                        return t.GetString();
                }
            }
            catch { }
            return null;
        }

        private static object? ToObject(JsonElement el)
        {
            return el.ValueKind switch
            {
                JsonValueKind.String => el.GetString(),
                JsonValueKind.Number => el.TryGetInt64(out var i) ? i : el.GetDecimal(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Object => JsonSerializer.Deserialize<Dictionary<string, object?>>(el.GetRawText()),
                JsonValueKind.Array => JsonSerializer.Deserialize<List<object?>>(el.GetRawText()),
                _ => null
            };
        }

        private static int? GetInt(Dictionary<string, object?> args, string key)
            => args.TryGetValue(key, out var v) && v != null ? Convert.ToInt32(v) : null;

        private static decimal? GetDecimal(Dictionary<string, object?> args, string key)
            => args.TryGetValue(key, out var v) && v != null ? Convert.ToDecimal(v) : null;

        private static bool? GetBool(Dictionary<string, object?> args, string key)
            => args.TryGetValue(key, out var v) && v != null ? Convert.ToBoolean(v) : null;

        private static string? GetString(Dictionary<string, object?> args, string key)
            => args.TryGetValue(key, out var v) ? v?.ToString() : null;
    }
}
