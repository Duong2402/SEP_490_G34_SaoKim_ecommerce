using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Services
{
    public class CustomerService : ICustomerService
    {
        private readonly SaoKimDBContext _db;

        public CustomerService(SaoKimDBContext db)
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

        public async Task<(List<CustomerListItemDto> items, int total)> GetCustomersAsync(
            string? q,
            DateTime? createdFrom,
            DateTime? createdTo,
            decimal? minSpend,
            int? minOrders,
            string sortBy,
            string sortDir,
            int page,
            int pageSize)
        {
            var customerRoleId = await GetCustomerRoleIdAsync();
            if (customerRoleId == 0)
            {
                return (new List<CustomerListItemDto>(), 0);
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

            sortBy = sortBy?.ToLower() ?? "created";
            sortDir = sortDir?.ToLower() ?? "desc";

            list = sortDir == "asc"
                ? sortBy switch
                {
                    "orders" => list.OrderBy(x => x.OrdersCount).ToList(),
                    "totalspend" => list.OrderBy(x => x.TotalSpend).ToList(),
                    "lastorder" => list.OrderBy(x => x.LastOrderAt).ToList(),
                    "created" => list.OrderBy(x => x.CreateAt).ToList(),
                    _ => list.OrderBy(x => x.CreateAt).ToList()
                }
                : sortBy switch
                {
                    "orders" => list.OrderByDescending(x => x.OrdersCount).ToList(),
                    "totalspend" => list.OrderByDescending(x => x.TotalSpend).ToList(),
                    "lastorder" => list.OrderByDescending(x => x.LastOrderAt).ToList(),
                    "created" => list.OrderByDescending(x => x.CreateAt).ToList(),
                    _ => list.OrderByDescending(x => x.CreateAt).ToList()
                };

            var total = list.Count;

            var items = list
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return (items, total);
        }

        public async Task<CustomerDetailDto?> GetCustomerDetailAsync(int id)
        {
            var customerRoleId = await GetCustomerRoleIdAsync();
            if (customerRoleId == 0) return null;

            var u = await _db.Users
                .Include(x => x.Orders)
                .Include(x => x.Notes).ThenInclude(n => n.Staff)
                .FirstOrDefaultAsync(x =>
                    x.UserID == id &&
                    x.DeletedAt == null &&
                    x.RoleId == customerRoleId);

            if (u == null) return null;

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

            return dto;
        }

        public async Task<CustomerNoteDto> AddNoteAsync(int customerId, int staffId, string content)
        {
            var customerExists = await _db.Users.AnyAsync(u =>
                u.UserID == customerId && u.DeletedAt == null);

            if (!customerExists)
                throw new KeyNotFoundException("Không tìm thấy khách hàng");

            var note = new CustomerNote
            {
                CustomerId = customerId,
                StaffId = staffId,
                Content = content.Trim()
            };

            _db.CustomerNotes.Add(note);

            var log = new StaffActionLog
            {
                StaffId = staffId,
                Action = "AddCustomerNote",
                PayloadJson = JsonSerializer.Serialize(new { customerId })
            };
            _db.StaffActionLogs.Add(log);

            await _db.SaveChangesAsync();

            return new CustomerNoteDto(
                note.NoteId,
                note.StaffId,
                "", 
                note.Content,
                note.CreatedAt
            );
        }

        public async Task<CustomerNoteDto?> UpdateNoteAsync(int customerId, int noteId, string content)
        {
            var note = await _db.CustomerNotes
                .Include(n => n.Staff)
                .FirstOrDefaultAsync(n =>
                    n.NoteId == noteId &&
                    n.CustomerId == customerId);

            if (note == null) return null;

            note.Content = content.Trim();
            await _db.SaveChangesAsync();

            return new CustomerNoteDto(
                note.NoteId,
                note.StaffId,
                note.Staff?.Name ?? "",
                note.Content,
                note.CreatedAt
            );
        }

        public async Task<bool> DeleteNoteAsync(int customerId, int noteId)
        {
            var note = await _db.CustomerNotes
                .FirstOrDefaultAsync(n =>
                    n.NoteId == noteId &&
                    n.CustomerId == customerId);

            if (note == null) return false;

            _db.CustomerNotes.Remove(note);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SoftDeleteCustomerAsync(int customerId, int staffId)
        {
            var u = await _db.Users
                .FirstOrDefaultAsync(x => x.UserID == customerId && x.DeletedAt == null);

            if (u == null) return false;

            u.DeletedAt = DateTime.UtcNow;

            var log = new StaffActionLog
            {
                StaffId = staffId,
                Action = "SoftDeleteCustomer",
                PayloadJson = JsonSerializer.Serialize(new { customerId })
            };
            _db.StaffActionLogs.Add(log);

            await _db.SaveChangesAsync();

            return true;
        }

        public async Task<(byte[] content, string fileName)> ExportCustomersExcelAsync(
            string? q,
            DateTime? createdFrom,
            DateTime? createdTo)
        {
            var wb = new XLWorkbook();
            var ws = wb.AddWorksheet("Customers");

            string[] headers =
            {
                "ID khách hàng",
                "Tên khách hàng",
                "Email",
                "Số điện thoại",
                "Ngày tạo",
                "Số đơn hàng",
                "Tổng chi tiêu",
                "Đơn gần nhất"
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
                return (msEmpty.ToArray(), emptyName);
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
            return (ms.ToArray(), fileName);
        }
    }
}
