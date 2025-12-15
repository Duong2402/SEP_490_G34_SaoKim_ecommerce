using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Models;
using System.Security.Claims;


namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly SaoKimDBContext _db;

        public NotificationsController(SaoKimDBContext db)
        {
            _db = db;
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> UnreadCount()
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(ApiResponse<object>.Fail("Token thiếu userId claim"));

            var count = await _db.UserNotifications
                .CountAsync(x => x.UserID == userId && !x.IsRead);

            return Ok(ApiResponse<object>.Ok(new { count }));
        }

        // GET /api/notifications?page=1&pageSize=10&group=Promotions&onlyUnread=true
        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] string? group,
            [FromQuery] bool onlyUnread = false,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var userId = int.Parse(User.FindFirst("UserId")!.Value);

            var qry = _db.UserNotifications
                .Where(x => x.UserID == userId)
                .Include(x => x.Notification)
                .AsQueryable();

            if (onlyUnread)
                qry = qry.Where(x => !x.IsRead);

            qry = qry.OrderByDescending(x => x.Notification.CreatedAt);

            var total = await qry.CountAsync();

            var items = await qry
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    userNotificationId = x.UserNotificationId,   
                    isRead = x.IsRead,
                    readAt = x.ReadAt,
                    notification = new
                    {
                        notificationId = x.Notification.NotificationId, 
                        title = x.Notification.Title,
                        body = x.Notification.Body,
                        type = x.Notification.Type,
                        linkUrl = x.Notification.LinkUrl,
                        createdAt = x.Notification.CreatedAt
                    }
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(new { items, total, page, pageSize }));
        }
        private bool TryGetUserId(out int userId)
        {
            userId = 0;

            var raw =
                User.FindFirstValue("userId") ??
                User.FindFirstValue("UserID") ??
                User.FindFirstValue("id") ??
                User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue("sub");

            return int.TryParse(raw, out userId);
        }

        [HttpPost("{userNotificationId:int}/read")]
        public async Task<IActionResult> MarkRead([FromRoute] int userNotificationId)
        {
            if (!TryGetUserId(out var userId))
                return Unauthorized(ApiResponse<object>.Fail("Token thiếu userId"));

            var row = await _db.UserNotifications
                .FirstOrDefaultAsync(x =>
                    x.UserNotificationId == userNotificationId &&
                    x.UserID == userId);

            if (row == null)
                return NotFound(ApiResponse<object>.Fail("Không tìm thấy thông báo"));

            if (!row.IsRead)
            {
                row.IsRead = true;
                row.ReadAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }

            return Ok(ApiResponse<object>.Ok(new { }, "Đã đọc"));
        }

    }
}
