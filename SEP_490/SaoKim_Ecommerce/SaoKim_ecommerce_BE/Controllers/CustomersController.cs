using System;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Dtos.Customers;
using SaoKim_ecommerce_BE.Entities;
using System.Globalization;
using ClosedXML.Excel;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("api/[controller]")]
    // Sau khi test xong có thể bật lại:
    // [Authorize(Roles = "staff")]  // hoặc "staff,admin" tùy hệ thống
    public class CustomersController : ControllerBase
    {
        private readonly SaoKimDBContext _db;

        public CustomersController(SaoKimDBContext db)
        {
            _db = db;
        }

        // Lấy role_id của role 'customer'
        private async Task<int> GetCustomerRoleIdAsync()
        {
            return await _db.Roles
                .Where(r => r.Name.ToLower() == "customer")   // dùng Name, không phải RoleName
                .Select(r => r.RoleId)
                .FirstOrDefaultAsync();
        }


        // GET /api/customers
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? q = null,
            [FromQuery] string status = "all",
            [FromQuery] DateTime? createdFrom = null,
            [FromQuery] DateTime? createdTo = null,
            [FromQuery] decimal? minSpend = null,
            [FromQuery] int? minOrders = null,
            [FromQuery] string sortBy = "created",
            [FromQuery] string sortDir = "desc",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize <= 0 || pageSize > 200) pageSize = 10;

            // Chuẩn hóa createdFrom/createdTo về UTC để khớp timestamptz của PostgreSQL
            if (createdFrom.HasValue && createdFrom.Value.Kind == DateTimeKind.Unspecified)
            {
                createdFrom = DateTime.SpecifyKind(createdFrom.Value, DateTimeKind.Utc);
            }

            if (createdTo.HasValue && createdTo.Value.Kind == DateTimeKind.Unspecified)
            {
                createdTo = DateTime.SpecifyKind(createdTo.Value, DateTimeKind.Utc);
            }

            var customerRoleId = await GetCustomerRoleIdAsync();
            if (customerRoleId == 0)
            {
                return Ok(new
                {
                    total = 0,
                    page,
                    pageSize,
                    items = Array.Empty<CustomerListItemDto>()
                });
            }

            // 1. Query users (IQueryable<User>) + filter trên DB
            var usersQuery = _db.Users
                .AsNoTracking()
                .Include(u => u.Orders)
                .Where(u =>
                    u.DeletedAt == null &&
                    u.RoleId == customerRoleId);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                usersQuery = usersQuery.Where(u =>
                    u.Name.ToLower().Contains(term) ||
                    u.Email.ToLower().Contains(term) ||
                    (u.PhoneNumber != null && u.PhoneNumber.ToLower().Contains(term)));
            }

            status = status?.ToLower() ?? "all";
            if (status == "active")
                usersQuery = usersQuery.Where(u => !u.IsBanned);
            else if (status == "banned")
                usersQuery = usersQuery.Where(u => u.IsBanned);

            if (createdFrom.HasValue)
                usersQuery = usersQuery.Where(u => u.CreateAt >= createdFrom.Value);
            if (createdTo.HasValue)
                usersQuery = usersQuery.Where(u => u.CreateAt < createdTo.Value);

            // 2. Project sang DTO và MATERIALIZE về memory
            var list = await usersQuery
                .Select(u => new CustomerListItemDto(
                    u.UserID,
                    u.Name,
                    u.Email,
                    u.PhoneNumber,
                    u.CreateAt,
                    u.IsBanned,
                    u.Orders.Count(),
                    u.Orders
                        .Where(o => o.Status == "Completed")
                        .Sum(o => (decimal?)o.Total) ?? 0m,
                    u.Orders.Max(o => (DateTime?)o.CreatedAt)
                ))
                .ToListAsync(); // từ đây trở xuống chỉ còn LINQ trên List<>

            // 3. Lọc tiếp theo minSpend / minOrders trong memory
            if (minSpend.HasValue)
                list = list.Where(c => c.TotalSpend >= minSpend.Value).ToList();

            if (minOrders.HasValue)
                list = list.Where(c => c.OrdersCount >= minOrders.Value).ToList();

            // 4. Sort trong memory
            var dir = sortDir.ToLower() == "asc" ? "asc" : "desc";

            list = (sortBy?.ToLower(), dir) switch
            {
                ("totalspend", "asc") => list.OrderBy(c => c.TotalSpend).ToList(),
                ("totalspend", _) => list.OrderByDescending(c => c.TotalSpend).ToList(),

                ("orders", "asc") => list.OrderBy(c => c.OrdersCount).ToList(),
                ("orders", _) => list.OrderByDescending(c => c.OrdersCount).ToList(),

                ("lastorder", "asc") => list.OrderBy(c => c.LastOrderAt).ToList(),
                ("lastorder", _) => list.OrderByDescending(c => c.LastOrderAt).ToList(),

                ("created", "asc") => list.OrderBy(c => c.CreateAt).ToList(),
                ("created", _) => list.OrderByDescending(c => c.CreateAt).ToList(),

                _ => list.OrderByDescending(c => c.CreateAt).ToList()
            };

            // 5. Paging trong memory
            var total = list.Count;
            var items = list
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new
            {
                total,
                page,
                pageSize,
                items
            });
        }
    



        // GET /api/customers/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var customerRoleId = await GetCustomerRoleIdAsync();
            if (customerRoleId == 0) return NotFound();

            var u = await _db.Users
                .Include(x => x.Orders)
                .Include(x => x.Notes).ThenInclude(n => n.Staff)
                .FirstOrDefaultAsync(x =>
                    x.UserID == id &&
                    x.DeletedAt == null &&
                    x.RoleId == customerRoleId);

            if (u == null) return NotFound();

            var dto = new CustomerDetailDto(
                u.UserID,
                u.Name,
                u.Email,
                u.PhoneNumber,
                u.Address,
                u.CreateAt,
                u.IsBanned,
                u.Orders.Count,
                u.Orders
                    .Where(o => o.Status == "Completed")
                    .Sum(o => o.Total),
                u.Orders.Max(o => (DateTime?)o.CreatedAt),
                u.Notes
                    .OrderByDescending(n => n.CreatedAt)
                    .Select(n => new CustomerNoteDto(
                        n.NoteId,
                        n.StaffId,
                        n.Staff.Name,
                        n.Content,
                        n.CreatedAt
                    ))
            );

            return Ok(dto);
        }

        // GET /api/customers/{id}/orders
        [HttpGet("{id:int}/orders")]
        public async Task<IActionResult> GetOrders(
            int id,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 5)   // để mặc định 5 đơn gần nhất
        {
            if (page < 1) page = 1;
            if (pageSize <= 0 || pageSize > 200) pageSize = 5;

            var customerRoleId = await GetCustomerRoleIdAsync();
            if (customerRoleId == 0) return NotFound();

            var exists = await _db.Users
                .AnyAsync(u =>
                    u.UserID == id &&
                    u.DeletedAt == null &&
                    u.RoleId == customerRoleId);

            if (!exists) return NotFound();

            var query = _db.Orders
                .AsNoTracking()
                .Where(o => o.UserId == id);

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new
                {
                    o.OrderId,
                    o.Total,
                    o.Status,
                    o.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                items
            });
        }

        // POST /api/customers/{id}/notes
        [HttpPost("{id:int}/notes")]
        public async Task<IActionResult> AddNote(int id, [FromBody] CustomerNoteCreateRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Content))
                return BadRequest("Content is required.");

            var customerRoleId = await GetCustomerRoleIdAsync();
            if (customerRoleId == 0) return NotFound();

            var customer = await _db.Users
                .FirstOrDefaultAsync(u =>
                    u.UserID == id &&
                    u.DeletedAt == null &&
                    u.RoleId == customerRoleId);

            if (customer == null) return NotFound();

            var staffIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(staffIdStr, out var staffId))
                return Forbid();

            var note = new CustomerNote
            {
                CustomerId = id,
                StaffId = staffId,
                Content = req.Content
            };
            _db.CustomerNotes.Add(note);

            var log = new StaffActionLog
            {
                StaffId = staffId,
                Action = "AddCustomerNote",
                PayloadJson = JsonSerializer.Serialize(new { customerId = id })
            };
            _db.StaffActionLogs.Add(log);

            await _db.SaveChangesAsync();

            return Ok(new
            {
                note.NoteId,
                note.Content,
                note.CreatedAt,
                note.StaffId
            });
        }

        public class UpdateStatusRequest
        {
            public bool IsBanned { get; set; }
        }

        // PATCH /api/customers/{id}/status
        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusRequest req)
        {
            var customerRoleId = await GetCustomerRoleIdAsync();
            if (customerRoleId == 0) return NotFound();

            var u = await _db.Users
                .FirstOrDefaultAsync(x =>
                    x.UserID == id &&
                    x.DeletedAt == null &&
                    x.RoleId == customerRoleId);

            if (u == null) return NotFound();

            u.IsBanned = req.IsBanned;

            var staffIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(staffIdStr, out var staffId))
                return Forbid();

            var log = new StaffActionLog
            {
                StaffId = staffId,
                Action = "UpdateCustomerStatus",
                PayloadJson = JsonSerializer.Serialize(new { customerId = id, u.IsBanned })
            };
            _db.StaffActionLogs.Add(log);

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE /api/customers/{id}  (soft delete)
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> SoftDelete(int id)
        {
            var customerRoleId = await GetCustomerRoleIdAsync();
            if (customerRoleId == 0) return NotFound();

            var u = await _db.Users
                .FirstOrDefaultAsync(x =>
                    x.UserID == id &&
                    x.DeletedAt == null &&
                    x.RoleId == customerRoleId);

            if (u == null) return NotFound();

            var staffIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(staffIdStr, out var staffId))
                return Forbid();

            u.DeletedAt = DateTime.UtcNow;

            var log = new StaffActionLog
            {
                StaffId = staffId,
                Action = "SoftDeleteCustomer",
                PayloadJson = JsonSerializer.Serialize(new { customerId = id })
            };
            _db.StaffActionLogs.Add(log);

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // GET /api/customers/export
        [HttpGet("export")]
        public async Task<IActionResult> ExportExcel(
            [FromQuery] string? q = null,
            [FromQuery] string status = "all",
            [FromQuery] DateTime? createdFrom = null,
            [FromQuery] DateTime? createdTo = null)
        {
            var customerRoleId = await GetCustomerRoleIdAsync();

            using var wb = new XLWorkbook();
            var ws = wb.AddWorksheet("Customers");

            string[] headers =
            {
                "Id", "Name", "Email", "PhoneNumber",
                "IsBanned", "CreateAt", "OrdersCount",
                "TotalSpend", "LastOrderAt"
            };

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = ws.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.LightGray;
            }

            if (customerRoleId == 0)
            {
                using var msEmpty = new MemoryStream();
                wb.SaveAs(msEmpty);
                return File(msEmpty.ToArray(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"customers-{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx");
            }

            var query = _db.Users
                .AsNoTracking()
                .Include(u => u.Orders)
                .Where(u => u.DeletedAt == null && u.RoleId == customerRoleId);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                query = query.Where(u =>
                    u.Name.ToLower().Contains(term) ||
                    u.Email.ToLower().Contains(term) ||
                    (u.PhoneNumber != null && u.PhoneNumber.ToLower().Contains(term)));
            }

            status = status?.ToLower() ?? "all";
            if (status == "active")
                query = query.Where(u => !u.IsBanned);
            else if (status == "banned")
                query = query.Where(u => u.IsBanned);

            if (createdFrom.HasValue)
                query = query.Where(u => u.CreateAt >= createdFrom.Value);
            if (createdTo.HasValue)
                query = query.Where(u => u.CreateAt < createdTo.Value);

            var rows = await query.Select(u => new
            {
                u.UserID,
                u.Name,
                u.Email,
                u.PhoneNumber,
                u.IsBanned,
                u.CreateAt,
                OrdersCount = u.Orders.Count(),
                TotalSpend = u.Orders
                    .Where(o => o.Status == "Completed")
                    .Sum(o => (decimal?)o.Total) ?? 0m,
                LastOrderAt = u.Orders.Max(o => (DateTime?)o.CreatedAt)
            }).ToListAsync();

            int currentRow = 2;

            foreach (var r in rows)
            {
                ws.Cell(currentRow, 1).Value = r.UserID;
                ws.Cell(currentRow, 2).Value = r.Name;
                ws.Cell(currentRow, 3).Value = r.Email;

                var phoneCell = ws.Cell(currentRow, 4);
                phoneCell.Value = r.PhoneNumber ?? "";
                phoneCell.Style.NumberFormat.Format = "@"; // text

                ws.Cell(currentRow, 5).Value = r.IsBanned ? "TRUE" : "FALSE";

                var cCreate = ws.Cell(currentRow, 6);
                cCreate.Value = r.CreateAt;
                cCreate.Style.DateFormat.Format = "yyyy-MM-dd HH:mm:ss";

                ws.Cell(currentRow, 7).Value = r.OrdersCount;

                var cTotal = ws.Cell(currentRow, 8);
                cTotal.Value = r.TotalSpend;
                cTotal.Style.NumberFormat.Format = "#,##0";

                var cLast = ws.Cell(currentRow, 9);
                if (r.LastOrderAt.HasValue)
                {
                    cLast.Value = r.LastOrderAt.Value;
                    cLast.Style.DateFormat.Format = "yyyy-MM-dd HH:mm:ss";
                }

                currentRow++;
            }

            ws.Columns().AdjustToContents();

            using var ms = new MemoryStream();
            wb.SaveAs(ms);

            var fileName = $"customers-{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx";
            return File(ms.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName);
        }
    }
}
