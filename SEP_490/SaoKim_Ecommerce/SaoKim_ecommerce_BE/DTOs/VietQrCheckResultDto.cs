public class VietQrCheckResultDto
{
    public bool Matched { get; set; }
    public int Amount { get; set; }
    public string? PaymentToken { get; set; }
    public string Source { get; set; } = "AppsScript";
    public string? MatchedTxnId { get; set; }
    public string? MatchedDesc { get; set; }
    public string? Error { get; set; }
}
