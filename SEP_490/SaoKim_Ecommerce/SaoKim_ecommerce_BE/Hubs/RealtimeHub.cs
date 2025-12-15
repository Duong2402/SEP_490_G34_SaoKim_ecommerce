using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SaoKim_ecommerce_BE.Hubs
{
    [Authorize]
    public class RealtimeHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var user = Context.User;

            if (user?.Identity?.IsAuthenticated == true)
            {
                if (user.IsInRole("warehouse_manager"))
                    await Groups.AddToGroupAsync(Context.ConnectionId, "warehouse_manager");

                if (user.IsInRole("admin"))
                    await Groups.AddToGroupAsync(Context.ConnectionId, "admin");

                if (user.IsInRole("staff"))
                    await Groups.AddToGroupAsync(Context.ConnectionId, "staff");

                if (user.IsInRole("manager"))
                    await Groups.AddToGroupAsync(Context.ConnectionId, "manager");
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await base.OnDisconnectedAsync(exception);
        }
    }
}
