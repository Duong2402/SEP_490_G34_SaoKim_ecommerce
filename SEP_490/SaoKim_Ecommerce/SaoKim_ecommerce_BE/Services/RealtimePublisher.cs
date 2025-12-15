using Microsoft.AspNetCore.SignalR;
using SaoKim_ecommerce_BE.Hubs;

namespace SaoKim_ecommerce_BE.Services.Realtime
{
    public class RealtimePublisher : IRealtimePublisher
    {
        private readonly IHubContext<RealtimeHub> _hub;

        public RealtimePublisher(IHubContext<RealtimeHub> hub)
        {
            _hub = hub;
        }

        public Task PublishToWarehouseAsync(string type, object data)
        {
            return _hub.Clients.Group("warehouse_manager").SendAsync("evt", new
            {
                type,
                createdAtUtc = DateTime.UtcNow,
                data
            });
        }
        public Task PublishAsync(string type, object data)
        {
            return _hub.Clients.All.SendAsync("evt", new
            {
                type,
                createdAtUtc = DateTime.UtcNow,
                data
            });
        }

        public Task PublishToUserAsync(int userId, string type, object data)
        {
            return _hub.Clients
                .User(userId.ToString())
                .SendAsync("evt", new
                {
                    type,
                    createdAtUtc = DateTime.UtcNow,
                    data
                });
        }
        public Task PublishToRoleAsync(string role, string type, object data)
        {
            return _hub.Clients
                .Group(role)
                .SendAsync("evt", new
                {
                    type,
                    createdAtUtc = DateTime.UtcNow,
                    data
                });
        }
    }
}
