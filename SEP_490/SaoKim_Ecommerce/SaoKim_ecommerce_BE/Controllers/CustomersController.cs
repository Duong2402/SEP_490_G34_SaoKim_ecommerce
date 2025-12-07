using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Dtos.Customers;
using SaoKim_ecommerce_BE.Entities;
using System.Security.Claims;
using System.Text.Json;
using static SaoKim_ecommerce_BE.Entities.CustomerNote;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Authorize(Roles = "staff")]
    [Route("api/[controller]")]
    public class CustomersController : ControllerBase
    {
        private readonly SaoKimDBContext _db;

        public CustomersController(SaoKimDBContext db)
        {
            _db = db;
        }

        private async Task<int> GetCustomerRoleIdAsync()
        {
            return await _db.Roles
                .Where(r => r.Name.ToLower() == "customer")
                .Select(r => r.RoleId)
                .FirstOrDefaultAsync();
        }

        // GET /api/customers
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? q = null,
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
            if (pageSize < 1 || pageSize > 200) pageSize = 10;

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

            if (createdFrom.HasValue)
                query = query.Where(u => u.CreateAt >= createdFrom.Value);

            if (createdTo.HasValue)
                query = query.Where(u => u.CreateAt < createdTo.Value);

            var list = await query
                .Select(u => new CustomerListItemDto(
                    u.UserID,
                    u.Name,
                    u.Email,
                    u.PhoneNumber,
                    u.CreateAt,
                    u.Orders.Count(),
                    u.Orders.Where(o => o.Status == "Completed")
                            .Sum(o => (decimal?)o.Total) ?? 0m,
                    u.Orders.Max(o => (DateTime?)o.CreatedAt)
                ))
                .ToListAsync();

            if (minSpend.HasValue)
                list = list.Where(x => x.TotalSpend >= minSpend.Value).ToList();

            if (minOrders.HasValue)
                list = list.Where(x => x.OrdersCount >= minOrders.Value).ToList();

            list = sortDir.ToLower() == "asc" ? sortBy.ToLower() switch
            {
                "orders" => list.OrderBy(x => x.OrdersCount).ToList(),
                "totalspend" => list.OrderBy(x => x.TotalSpend).ToList(),
                "lastorder" => list.OrderBy(x => x.LastOrderAt).ToList(),
                "created" => list.OrderBy(x => x.CreateAt).ToList(),
                _ => list.OrderBy(x => x.CreateAt).ToList()
            }
            :
            sortBy.ToLower() switch
            {
                "orders" => list.OrderByDescending(x => x.OrdersCount).ToList(),
                "totalspend" => list.OrderByDescending(x => x.TotalSpend).ToList(),
                "lastorder" => list.OrderByDescending(x => x.LastOrderAt).ToList(),
                "created" => list.OrderByDescending(x => x.CreateAt).ToList(),
                _ => list.OrderByDescending(x => x.CreateAt).ToList()
            };

            var items = list.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return Ok(new
            {
                total = list.Count,
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

            var addr = await _db.Addresses
                .Where(a => a.UserId == u.UserID && a.IsDefault)
                .FirstOrDefaultAsync();

            string addressDisplay =
                addr != null
                    ? string.Join(", ", new[]
                        {
                            addr.Line1,
                            addr.Ward,
                            addr.District,
                            addr.Province
                        }.Where(x => !string.IsNullOrWhiteSpace(x)))
                    : (u.Address ?? "");

            var dto = new CustomerDetailDto(
                u.UserID,
                u.Name,
                u.Email,
                u.PhoneNumber,
                addressDisplay,
                u.CreateAt,
                u.Orders.Count(),
                u.Orders.Where(o => o.Status == "Completed").Sum(o => o.Total),
                u.Orders.Max(o => (DateTime?)o.CreatedAt),
                u.Notes
                    .OrderByDescending(n => n.CreatedAt)
                    .Select(n => new CustomerNoteDto(
                        n.NoteId,
                        n.StaffId,
                        n.Staff.Name,
                        n.Content,
                        n.CreatedAt))
            );

            return Ok(dto);
        }

        // GET /api/customers/{id}/orders
        [HttpGet("{id:int}/orders")]
        public async Task<IActionResult> GetOrders(
            int id,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 5)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 200) pageSize = 5;

            var exists = await _db.Users
                .AnyAsync(u => u.UserID == id && u.DeletedAt == null);

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

            return Ok(new { total, page, pageSize, items });
        }

        // POST /api/customers/{id}/notes
        [HttpPost("{id:int}/notes")]
        [Authorize(Roles = "staff,manager,admin")]
        public async Task<IActionResult> AddNote(int id, [FromBody] CustomerNoteCreateRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Content))
                return BadRequest("Content is required.");

            var customerExists = await _db.Users.AnyAsync(u =>
                u.UserID == id && u.DeletedAt == null);

            if (!customerExists) return NotFound();

            var staffIdStr = User.FindFirstValue("UserId");
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

        // PUT /api/customers/{customerId}/notes/{noteId}
        [HttpPut("{customerId:int}/notes/{noteId:int}")]
        public async Task<IActionResult> UpdateNote(
            int customerId,
            int noteId,
            [FromBody] CustomerNoteUpdateRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Content))
                return BadRequest("Content is required.");

            var note = await _db.CustomerNotes
                .Include(n => n.Staff)
                .FirstOrDefaultAsync(n =>
                    n.NoteId == noteId &&
                    n.CustomerId == customerId);

            if (note == null) return NotFound();

            note.Content = req.Content.Trim();

            await _db.SaveChangesAsync();

            return Ok(new
            {
                note.NoteId,
                note.Content,
                note.CreatedAt,
                note.StaffId
            });
        }

        // DELETE /api/customers/{customerId}/notes/{noteId}
        [HttpDelete("{customerId:int}/notes/{noteId:int}")]
        public async Task<IActionResult> DeleteNote(int customerId, int noteId)
        {
            var note = await _db.CustomerNotes
                .FirstOrDefaultAsync(n =>
                    n.NoteId == noteId &&
                    n.CustomerId == customerId);

            if (note == null) return NotFound();

            _db.CustomerNotes.Remove(note);
            await _db.SaveChangesAsync();

            return NoContent();
        }

        // DELETE /api/customers/{id} (Soft delete)
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> SoftDelete(int id)
        {
            var u = await _db.Users
                .FirstOrDefaultAsync(x => x.UserID == id && x.DeletedAt == null);

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
    [FromQuery] DateTime? createdFrom = null,
    [FromQuery] DateTime? createdTo = null)
        {
            var wb = new XLWorkbook();
            var ws = wb.AddWorksheet("Customers");

            string[] headers =
            {
        "Id", "Name", "Email", "PhoneNumber",
        "CreateAt", "OrdersCount", "TotalSpend", "LastOrderAt"
    };

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = ws.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Fill.BackgroundColor = XLColor.LightGray;
            }

            var customerRoleId = await GetCustomerRoleIdAsync();

            if (customerRoleId == 0)
            {
                using var msEmpty = new MemoryStream();
                wb.SaveAs(msEmpty);
                var emptyName = $"customers-{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx";
                return File(msEmpty.ToArray(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    emptyName);
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

            if (createdFrom.HasValue)
                query = query.Where(u => u.CreateAt >= createdFrom.Value);

            if (createdTo.HasValue)
                query = query.Where(u => u.CreateAt < createdTo.Value);

            var rows = await query
                .Select(u => new
                {
                    u.UserID,
                    u.Name,
                    u.Email,
                    u.PhoneNumber,
                    u.CreateAt,
                    OrdersCount = u.Orders.Count(),
                    TotalSpend = u.Orders.Where(o => o.Status == "Completed")
                                         .Sum(o => (decimal?)o.Total) ?? 0m,
                    LastOrderAt = u.Orders.Max(o => (DateTime?)o.CreatedAt)
                })
                .ToListAsync();

            int row = 2;

            foreach (var r in rows)
            {
                ws.Cell(row, 1).Value = r.UserID;
                ws.Cell(row, 2).Value = r.Name;
                ws.Cell(row, 3).Value = r.Email;

                var phoneCell = ws.Cell(row, 4);
                phoneCell.Value = r.PhoneNumber ?? "";
                phoneCell.Style.NumberFormat.Format = "@";

                ws.Cell(row, 5).Value = r.CreateAt;
                ws.Cell(row, 6).Value = r.OrdersCount;
                ws.Cell(row, 7).Value = r.TotalSpend;
                ws.Cell(row, 8).Value = r.LastOrderAt;

                row++;
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
