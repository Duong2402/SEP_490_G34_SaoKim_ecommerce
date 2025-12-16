namespace SaoKim_ecommerce_BE.DTOs
{
    public class ChatRequestDto
    {
        public string SessionId { get; set; } = "";
        public string Message { get; set; } = "";
        public ChatContextDto Context { get; set; } = new();
    }

    public class ChatContextDto
    {
        public string Page { get; set; } = "";
        public int? ProductId { get; set; }
        public int? CategoryId { get; set; }
        public decimal? PriceMin { get; set; }
        public decimal? PriceMax { get; set; }
        public bool InStockOnly { get; set; } = true;
    }

    public class ChatResponseDto
    {
        public string ReplyText { get; set; } = "";
        public List<ChatProductCardDto> SuggestedProducts { get; set; } = new();
        public List<string> QuickReplies { get; set; } = new();
    }

    public class ChatProductCardDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public decimal Price { get; set; }
        public int Stock { get; set; }
        public string? ImageUrl { get; set; }
        public string? CategoryName { get; set; }
        public string? Unit { get; set; }
    }

    public class ChatOrchestratorResult
    {
        public string FinalText { get; set; } = "";
        public List<ChatProductCardDto> Products { get; set; } = new();
        public List<string> QuickReplies { get; set; } = new();
    }
}
