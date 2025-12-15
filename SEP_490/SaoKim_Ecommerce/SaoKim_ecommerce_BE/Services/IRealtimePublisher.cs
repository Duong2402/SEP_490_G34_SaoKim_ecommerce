namespace SaoKim_ecommerce_BE.Services.Realtime
{
    public interface IRealtimePublisher
    {
        Task PublishToWarehouseAsync(string type, object data);
        Task PublishAsync(string type, object data);
        Task PublishToUserAsync(int userId, string type, object data);
        Task PublishToRoleAsync(string role, string type, object data);
    }
}
