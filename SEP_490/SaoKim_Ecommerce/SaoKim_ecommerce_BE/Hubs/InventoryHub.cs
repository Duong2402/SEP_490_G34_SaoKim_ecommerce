using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SaoKim_ecommerce_BE.Hubs
{
    [Authorize(Roles = "warehouse_manager")]
    public class InventoryHub : Hub
    {
    }

}
