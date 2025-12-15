using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Hubs;

namespace SaoKim_ecommerce_BE.Services
{
    public class NotificationService : INotificationService
    {
        private readonly SaoKimDBContext _db;
        private readonly IHubContext<NotificationsHub> _hub;

        public NotificationService(SaoKimDBContext db, IHubContext<NotificationsHub> hub)
        {
            _db = db;
            _hub = hub;
        }

        private static string FormatDiscountValue(Entities.Promotion promo)
        {
            var type = promo.DiscountType.ToString().Trim().ToLower();

            if (type.Contains("percent"))
            {
                var v = (decimal)promo.DiscountValue;
                return $"{v:0.##}%";
            }

            var amount = (decimal)promo.DiscountValue;
            return $"{amount:0,0}đ";
        }

        public async Task CreatePromotionNotificationAsync(int promotionId)
        {
            var promo = await _db.Promotions.FirstOrDefaultAsync(p => p.Id == promotionId);
            if (promo == null) return;

            var now = DateTimeOffset.UtcNow;
            if (promo.Status != PromotionStatus.Active || promo.StartDate > now)
                return;

            var discountText = FormatDiscountValue(promo);
            var title = $"Có khuyến mãi mới giảm đến: {discountText}";

            var startOfDay = DateTime.UtcNow.Date;
            var endOfDay = startOfDay.AddDays(1);

            var existed = await _db.Notifications.AnyAsync(n =>
                n.Type == "Promotion" &&
                n.Title == title &&
                n.CreatedAt >= startOfDay &&
                n.CreatedAt < endOfDay);

            if (existed) return;

            var noti = new Notification
            {
                Title = title,
                Body = "Mua hàng ngay",
                Type = "Promotion",
                LinkUrl = "/products",
                CreatedAt = DateTime.UtcNow
            };

            _db.Notifications.Add(noti);
            await _db.SaveChangesAsync();

            var customerRoleIds = await _db.Roles
                .Where(r => r.Name != null && (
                    r.Name.Trim().ToLower() == "customer" ||
                    r.Name.Trim().ToLower() == "member"))
                .Select(r => r.RoleId)
                .ToListAsync();

            if (customerRoleIds.Count == 0) return;

            var userIds = await _db.Users
                .Where(u => customerRoleIds.Contains(u.RoleId) && u.DeletedAt == null)
                .Select(u => u.UserID)
                .ToListAsync();

            if (userIds.Count == 0) return;

            var rows = userIds.Select(uid => new UserNotification
            {
                UserID = uid,
                NotificationId = noti.NotificationId,
                IsRead = false
            });

            await _db.UserNotifications.AddRangeAsync(rows);
            await _db.SaveChangesAsync();

            await _hub.Clients.All.SendAsync("notification:new", new
            {
                notificationId = noti.NotificationId,
                title = noti.Title,
                body = noti.Body,
                linkUrl = noti.LinkUrl,
                type = noti.Type,
                createdAt = noti.CreatedAt
            });
        }

        public async Task CreateNewOrderNotificationToWarehouseAsync(int orderId)
        {
            // chống tạo trùng
            var startOfDay = DateTime.UtcNow.Date;
            var endOfDay = startOfDay.AddDays(1);

            var title = $"Có đơn hàng mới: ORD-{orderId}";
            var existed = await _db.Notifications.AnyAsync(n =>
                n.Type == "Order" &&
                n.Title == title &&
                n.CreatedAt >= startOfDay &&
                n.CreatedAt < endOfDay);

            if (existed) return;

            var noti = new Notification
            {
                Title = title,
                Body = "Xem phiếu xuất kho",
                Type = "Order",
                LinkUrl = $"/warehouse/dispatch-slips?salesOrderNo=ORD-{orderId}",
                CreatedAt = DateTime.UtcNow
            };

            _db.Notifications.Add(noti);
            await _db.SaveChangesAsync();

            var warehouseRoleIds = await _db.Roles
                .Where(r => r.Name != null && (
                    r.Name.Trim().ToLower() == "warehouse" ||
                    r.Name.Trim().ToLower() == "warehouse manager" ||
                    r.Name.Trim().ToLower() == "staff_warehouse"))
                .Select(r => r.RoleId)
                .ToListAsync();

            if (warehouseRoleIds.Count == 0) return;

            var warehouseUserIds = await _db.Users
                .Where(u => warehouseRoleIds.Contains(u.RoleId) && u.DeletedAt == null)
                .Select(u => u.UserID)
                .ToListAsync();

            if (warehouseUserIds.Count == 0) return;

            var rows = warehouseUserIds.Select(uid => new UserNotification
            {
                UserID = uid,
                NotificationId = noti.NotificationId,
                IsRead = false
            });

            await _db.UserNotifications.AddRangeAsync(rows);
            await _db.SaveChangesAsync();

            await _hub.Clients.All.SendAsync("notification:new", new
            {
                notificationId = noti.NotificationId,
                title = noti.Title,
                body = noti.Body,
                linkUrl = noti.LinkUrl,
                type = noti.Type,
                createdAt = noti.CreatedAt
            });
        }

    }
}
