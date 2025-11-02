using System.Text.Json.Serialization;

namespace SaoKim_ecommerce_BE.Entities
{
    [JsonConverter(typeof(JsonStringEnumConverter))] // giữ enum dạng chữ
    public enum TaskStatus
    {
        New = 0,         // FE có thể hiển thị nhãn "Pending"
        InProgress = 1,  // FE có thể hiển thị nhãn "Doing"
        Done = 2,
        Delayed = 3      // NEW: cho phép set/lưu trực tiếp trên chart
    }
}
