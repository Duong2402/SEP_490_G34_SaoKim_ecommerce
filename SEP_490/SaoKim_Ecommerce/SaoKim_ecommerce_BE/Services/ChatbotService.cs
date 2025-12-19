using System.Diagnostics;
using System.Text.Json;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services.Ai;
using SaoKim_ecommerce_BE.Services.ChatbotTools;

namespace SaoKim_ecommerce_BE.Services
{
    public class ChatbotService : IChatbotService
    {
        private readonly IGeminiAiClient _gemini;
        private readonly IChatbotToolService _tools;
        private readonly IConfiguration _config;
        private readonly IChatbotAnalyticsService _analytics;

        public ChatbotService(
            IGeminiAiClient gemini,
            IChatbotToolService tools,
            IConfiguration config,
            IChatbotAnalyticsService analytics)
        {
            _gemini = gemini;
            _tools = tools;
            _config = config;
            _analytics = analytics;
        }

        public async Task<ChatOrchestratorResult> HandleMessageAsync(string baseUrl, ChatRequestDto req, CancellationToken ct)
        {
            var model = _config["Gemini:Model"] ?? "gemini-2.5-flash";
            var message = (req.Message ?? "").Trim();

            if (message.Length == 0)
            {
                return new ChatOrchestratorResult
                {
                    FinalText = "Anh/chị vui lòng cho em biết nhu cầu, ví dụ: “Gợi ý đèn LED dưới 500k”, “Tìm đèn âm trần”, hoặc “Sản phẩm tương tự”.",
                    QuickReplies = BuildQuickReplies(req),
                    Products = new List<ChatProductCardDto>()
                };
            }

            var ctx = req.Context ?? new ChatContextDto();

            var sessionId = GetSessionIdFromContextOrNew(ctx);
            var anonymousId = GetAnonymousIdFromContextOrNull(ctx);
            int? userId = null;

            var session = await _analytics.UpsertSessionAsync(
                sessionId: sessionId,
                userId: userId,
                anonymousId: anonymousId,
                page: ctx.Page,
                productId: ctx.ProductId,
                categoryId: ctx.CategoryId,
                ct: ct);

            var userMsg = await _analytics.LogMessageAsync(session.Id, "user", message, ct);

            var functionDeclarations = BuildFunctionDeclarations();
            var prompt = BuildPrompt(req, message);

            var sw = Stopwatch.StartNew();

            var request1 = new
            {
                contents = new object[]
                {
                    new
                    {
                        role = "user",
                        parts = new object[] { new { text = prompt } }
                    }
                },
                tools = new object[]
                {
                    new { functionDeclarations }
                }
            };

            using var resp1 = await _gemini.GenerateContentAsync(model, request1, ct);
            var (fnName, fnArgs) = TryExtractFunctionCall(resp1);

            if (string.IsNullOrWhiteSpace(fnName))
            {
                sw.Stop();
                var t = TryExtractText(resp1);

                var finalNoTool = string.IsNullOrWhiteSpace(t)
                    ? "Em chưa hiểu rõ nhu cầu của anh/chị. Anh/chị muốn tìm theo tên, theo mã hay theo khoảng giá ạ?"
                    : t.Trim();

                await _analytics.LogMessageAsync(session.Id, "assistant", finalNoTool, ct);

                await _analytics.LogEventAsync(new ChatBotEvent
                {
                    SessionId = session.Id,
                    MessageId = userMsg.Id,
                    UserMessage = message,
                    DetectedIntent = null,
                    ToolName = null,
                    ToolArgs = null,
                    ToolResultCount = null,
                    ResponseText = finalNoTool,
                    ResponseType = "FreeText",
                    LatencyMs = (int)sw.ElapsedMilliseconds,
                    Model = model
                }, ct);

                return new ChatOrchestratorResult
                {
                    FinalText = finalNoTool,
                    QuickReplies = BuildQuickReplies(req),
                    Products = new List<ChatProductCardDto>()
                };
            }

            List<ChatProductCardDto> products;

            if (fnName == "get_similar_products")
            {
                var pid = GetInt(fnArgs, "productId") ?? ctx.ProductId;
                var limit = GetInt(fnArgs, "limit") ?? 8;

                products = pid.HasValue
                    ? await _tools.GetSimilarProductsAsync(baseUrl, pid.Value, limit)
                    : new List<ChatProductCardDto>();
            }
            else
            {
                var keyword = GetString(fnArgs, "keyword") ?? message;
                var categoryId = GetInt(fnArgs, "categoryId") ?? ctx.CategoryId;
                var priceMin = GetDecimal(fnArgs, "priceMin") ?? ctx.PriceMin;
                var priceMax = GetDecimal(fnArgs, "priceMax") ?? ctx.PriceMax;

                var inStockOnly = GetBool(fnArgs, "inStockOnly") ?? (ctx.InStockOnly ? true : true);
                var limit = GetInt(fnArgs, "limit") ?? 8;

                products = await _tools.SearchProductsAsync(
                    baseUrl,
                    keyword,
                    categoryId,
                    priceMin,
                    priceMax,
                    inStockOnly,
                    limit);
            }

            var request2 = new
            {
                contents = new object[]
                {
                    new
                    {
                        role = "user",
                        parts = new object[] { new { text = prompt } }
                    },
                    GetCandidateContent(resp1),
                    new
                    {
                        role = "user",
                        parts = new object[]
                        {
                            new
                            {
                                functionResponse = new
                                {
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
            sw.Stop();

            var finalText = (TryExtractText(resp2) ?? "").Trim();
            finalText = NormalizeFinalTextByProducts(finalText, products);

            await _analytics.LogMessageAsync(session.Id, "assistant", finalText, ct);

            var responseType = products == null || products.Count == 0
                ? "NoResult"
                : (fnName == "get_similar_products" ? "Similar" : "ToolSearch");

            await _analytics.LogEventAsync(new ChatBotEvent
            {
                SessionId = session.Id,
                MessageId = userMsg.Id,
                UserMessage = message,
                DetectedIntent = null,
                ToolName = fnName,
                ToolArgs = fnArgs != null && fnArgs.Count > 0 ? JsonSerializer.Serialize(fnArgs) : null,
                ToolResultCount = products?.Count ?? 0,
                ResponseText = finalText,
                ResponseType = responseType,
                LatencyMs = (int)sw.ElapsedMilliseconds,
                Model = model
            }, ct);

            return new ChatOrchestratorResult
            {
                FinalText = finalText,
                Products = products ?? new List<ChatProductCardDto>(),
                QuickReplies = BuildQuickReplies(req)
            };
        }

        private static Guid? GetSessionIdFromContextOrNew(ChatContextDto ctx)
        {
            var val = ReadStringProperty(ctx, "SessionId");
            if (Guid.TryParse(val, out var gid)) return gid;
            return Guid.NewGuid();
        }

        private static string? GetAnonymousIdFromContextOrNull(ChatContextDto ctx)
        {
            var val = ReadStringProperty(ctx, "AnonymousId");
            return string.IsNullOrWhiteSpace(val) ? null : val;
        }

        private static string? ReadStringProperty(object obj, string propName)
        {
            try
            {
                var p = obj.GetType().GetProperty(propName);
                if (p == null) return null;
                var v = p.GetValue(obj);
                return v?.ToString();
            }
            catch
            {
                return null;
            }
        }

        private static object[] BuildFunctionDeclarations()
        {
            return new object[]
            {
                new
                {
                    name = "search_products",
                    description = "Tìm sản phẩm trong database theo keyword, category, khoảng giá và điều kiện còn hàng.",
                    parameters = new
                    {
                        type = "object",
                        properties = new
                        {
                            keyword = new { type = "string", description = "Từ khóa: tên/mã/mô tả/nhà cung cấp. Có thể để trống." },
                            categoryId = new { type = "integer", description = "ID danh mục (nếu có)." },
                            priceMin = new { type = "number", description = "Giá tối thiểu (nếu có)." },
                            priceMax = new { type = "number", description = "Giá tối đa (nếu có)." },
                            inStockOnly = new { type = "boolean", description = "Chỉ lấy sản phẩm còn hàng." },
                            limit = new { type = "integer", description = "Số lượng sản phẩm trả về (1-12)." }
                        }
                    }
                },
                new
                {
                    name = "get_similar_products",
                    description = "Lấy sản phẩm tương tự dựa trên category của sản phẩm hiện tại.",
                    parameters = new
                    {
                        type = "object",
                        properties = new
                        {
                            productId = new { type = "integer", description = "ID sản phẩm gốc." },
                            limit = new { type = "integer", description = "Số lượng sản phẩm trả về (1-12)." }
                        },
                        required = new[] { "productId" }
                    }
                }
            };
        }

        private static string NormalizeFinalTextByProducts(string finalText, List<ChatProductCardDto> products)
        {
            products ??= new List<ChatProductCardDto>();
            var hasProducts = products.Count > 0;

            if (string.IsNullOrWhiteSpace(finalText))
            {
                return hasProducts
                    ? "Em đã tìm được một số sản phẩm phù hợp, anh/chị xem danh sách bên dưới giúp em nhé."
                    : "Hiện tại hệ thống chưa có sản phẩm phù hợp. Anh/chị cho em biết thêm ngân sách hoặc nhu cầu cụ thể để em tư vấn chính xác hơn ạ.";
            }

            if (!hasProducts) return finalText;

            var lower = finalText.ToLowerInvariant();
            var contradict =
                lower.Contains("chưa tìm") ||
                lower.Contains("không tìm") ||
                lower.Contains("không có sản phẩm") ||
                lower.Contains("hiện tại không có");

            if (contradict)
            {
                return "Em đã tìm được một số sản phẩm phù hợp, anh/chị xem danh sách gợi ý bên dưới giúp em nhé.";
            }

            return finalText;
        }

        private static string BuildPrompt(ChatRequestDto req, string message)
        {
            var ctx = req.Context ?? new ChatContextDto();

            return
$@"Bạn là chatbot tư vấn bán hàng của hệ thống Sao Kim.

QUY TẮC XƯNG HÔ (BẮT BUỘC):
- Bạn xưng là “em”
- Gọi khách hàng là “anh/chị”
- Không dùng “mình”, không dùng “bạn”

YÊU CẦU:
- Trò chuyện tự nhiên, lịch sự như nhân viên tư vấn thật.
- Chỉ gợi ý sản phẩm có trong hệ thống, không bịa.
- Khi cần danh sách sản phẩm, bắt buộc gọi công cụ (function).
- BẮT BUỘC dựa vào kết quả functionResponse:
  + Có sản phẩm: nói rõ là đã tìm thấy và giới thiệu ngắn gọn.
  + Không có sản phẩm: nói chưa tìm thấy và hỏi thêm 1–2 câu để làm rõ nhu cầu.
- Trả lời ngắn gọn, tối đa 4–6 câu.

NGỮ CẢNH:
- Page: {ctx.Page}
- ProductId: {ctx.ProductId}
- CategoryId: {ctx.CategoryId}
- PriceMin: {ctx.PriceMin}
- PriceMax: {ctx.PriceMax}
- InStockOnly: {ctx.InStockOnly}

KHÁCH HÀNG: {message}

GỢI Ý:
- Hỏi theo giá / tồn kho / danh mục: gọi search_products (keyword có thể để trống)
- Nếu có ProductId và hỏi liên quan: gọi get_similar_products";
        }

        private static List<string> BuildQuickReplies(ChatRequestDto req)
        {
            var list = new List<string>
            {
                "Gợi ý đèn dưới 500k",
                "Sản phẩm còn hàng",
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
