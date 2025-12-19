namespace SaoKim_ecommerce_BE.DTOs
{
    public class ChatbotOverviewDto
    {
        public int TotalSessions { get; set; }
        public int TotalMessages { get; set; }
        public double AvgLatencyMs { get; set; }
        public double FaqRate { get; set; }
        public double ToolRate { get; set; }
        public double NoResultRate { get; set; }
        public double Ctr { get; set; }
    }

    public class ChatbotTimeseriesPointDto
    {
        public string Date { get; set; } = "";
        public int Sessions { get; set; }
        public int NoResult { get; set; }
    }

    public class ChatbotTopItemDto
    {
        public string Label { get; set; } = "";
        public int Count { get; set; }
    }

    public class ChatbotTopProductClickDto
    {
        public int ProductId { get; set; }
        public string Name { get; set; } = "";
        public int Count { get; set; }
    }
}
