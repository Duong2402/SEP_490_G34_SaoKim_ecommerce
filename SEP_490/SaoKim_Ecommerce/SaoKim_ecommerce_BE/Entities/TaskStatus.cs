using System.Text.Json.Serialization;

namespace SaoKim_ecommerce_BE.Entities
{
    [JsonConverter(typeof(JsonStringEnumConverter))] // giữ enum dạng chữ
    public enum TaskStatus
    {
        New = 0,
        InProgress = 1,
        Done = 2,
        Delayed = 3
    }
}
