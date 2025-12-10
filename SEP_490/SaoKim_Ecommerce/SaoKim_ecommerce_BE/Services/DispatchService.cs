using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace SaoKim_ecommerce_BE.Services
{
    public class DispatchService : IDispatchService
    {
        private readonly SaoKimDBContext _db;

        public DispatchService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<DispatchSlipConfirmResultDto> ConfirmDispatchSlipAsync(int id)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();

            var slip = await _db.Dispatches
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (slip == null)
                throw new KeyNotFoundException("Phiếu xuất không tồn tại");

            if (slip.Status != DispatchStatus.Draft)
                throw new InvalidOperationException("Chỉ bản nháp mới được xác thực");

            if (slip.Items == null || slip.Items.Count == 0)
                throw new InvalidOperationException("Phiếu xuất không có sản phẩm để xác nhận");

            if (slip.Items.Any(i => i.ProductId == null))
                throw new InvalidOperationException("Tất cả sản phẩm phải có productID");

            var qtyByProduct = slip.Items
                .GroupBy(i => i.ProductId!.Value)
                .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

            var productIds = qtyByProduct.Keys.ToList();

            var products = await _db.Products
                .Where(p => productIds.Contains(p.ProductID))
                .ToDictionaryAsync(p => p.ProductID);

            var missing = productIds.Where(pid => !products.ContainsKey(pid)).ToList();
            if (missing.Count > 0)
                throw new InvalidOperationException("Một vài ID sản phẩm không tìm thấy");

            var details = await _db.ProductDetails
                .Where(d => productIds.Contains(d.ProductID))
                .ToDictionaryAsync(d => d.ProductID);

            var insufficient = qtyByProduct
                .Where(kv =>
                {
                    var productId = kv.Key;
                    var required = kv.Value;
                    return !details.TryGetValue(productId, out var detail) || detail.Quantity < required;
                })
                .ToList();

            if (insufficient.Count > 0)
                throw new InvalidOperationException("Không đủ hàng cho một số sản phẩm");

            var now = DateTime.UtcNow;

            foreach (var kv in qtyByProduct)
            {
                var productId = kv.Key;
                var deductedQty = kv.Value;

                var detail = details[productId];

                detail.Quantity -= deductedQty;
                detail.UpdateAt = now;
                detail.UpdateBy = "warehouse-manager";
            }

            slip.Status = DispatchStatus.Confirmed;
            slip.ConfirmedAt = now;
            if (!string.IsNullOrEmpty(slip.ReferenceNo) &&
    slip.ReferenceNo.StartsWith("ORD-", StringComparison.OrdinalIgnoreCase))
            {
                var raw = slip.ReferenceNo.Substring("ORD-".Length);
                if (int.TryParse(raw, out var orderId))
                {
                    var order = await _db.Orders.FirstOrDefaultAsync(o => o.OrderId == orderId);
                    if (order != null)
                    {

                        if (string.Equals(order.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
                        {
                            throw new InvalidOperationException("Đơn hàng đã bị hủy, không thể xác nhận phiếu xuất.");
                        }

                        if (string.Equals(order.Status, "Paid", StringComparison.OrdinalIgnoreCase))
                        {
                            order.Status = "Pending";
                        }
                    }
                }
            }


            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return new DispatchSlipConfirmResultDto
            {
                Id = slip.Id,
                ReferenceNo = slip.ReferenceNo,
                Status = slip.Status,
                ConfirmedAt = slip.ConfirmedAt,
                AffectedProducts = qtyByProduct
                    .Select(kv => new DispatchSlipConfirmProductDto
                    {
                        ProductId = kv.Key,
                        DeductedQty = kv.Value
                    })
                    .ToList()
            };
        }
        public async Task<PagedResult<DispatchSlipListItemDto>> GetDispatchSlipsAsync(DispatchSlipListQuery q)
        {
            if (q.Page <= 0) q.Page = 1;
            if (q.PageSize <= 0 || q.PageSize > 200) q.PageSize = 10;

            var sales = _db.Set<RetailDispatch>()
                .Select(x => new DispatchSlipListItemDto
                {
                    Id = x.Id,
                    Type = "Sales",
                    ReferenceNo = x.ReferenceNo,

                    SalesOrderNo = x.ReferenceNo,
                    RequestNo = null,

                    CustomerName = x.CustomerName,
                    ProjectName = null,

                    DispatchDate = x.DispatchDate,
                    Status = x.Status,
                    CreatedAt = x.CreatedAt,
                    ConfirmedAt = x.ConfirmedAt,
                    Note = x.Note
                });

            var projects = _db.Set<ProjectDispatch>()
                .Select(x => new DispatchSlipListItemDto
                {
                    Id = x.Id,
                    Type = "Project",
                    ReferenceNo = x.ReferenceNo,

                    SalesOrderNo = null,
                    RequestNo = x.ReferenceNo,

                    CustomerName = null,
                    ProjectName = x.ProjectName,

                    DispatchDate = x.DispatchDate,
                    Status = x.Status,
                    CreatedAt = x.CreatedAt,
                    ConfirmedAt = x.ConfirmedAt,
                    Note = x.Note
                });

            var query = sales.Concat(projects);

            if (!string.IsNullOrWhiteSpace(q.Type) &&
                !q.Type.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(x => x.Type == q.Type);
            }

            if (!string.IsNullOrWhiteSpace(q.Search))
            {
                var s = q.Search.Trim().ToLower();
                query = query.Where(x =>
                    x.ReferenceNo.ToLower().Contains(s) ||
                    (x.CustomerName ?? "").ToLower().Contains(s) ||
                    (x.ProjectName ?? "").ToLower().Contains(s));
            }

            var total = await query.CountAsync();

            var desc = string.Equals(q.SortOrder, "desc", StringComparison.OrdinalIgnoreCase);
            IOrderedQueryable<DispatchSlipListItemDto> ordered;

            switch (q.SortBy)
            {
                case "referenceNo":
                    ordered = desc
                        ? query.OrderByDescending(x => x.ReferenceNo).ThenByDescending(x => x.Id)
                        : query.OrderBy(x => x.ReferenceNo).ThenBy(x => x.Id);
                    break;

                case "dispatchDate":
                    ordered = desc
                        ? query.OrderByDescending(x => x.DispatchDate).ThenByDescending(x => x.Id)
                        : query.OrderBy(x => x.DispatchDate).ThenBy(x => x.Id);
                    break;

                case "createdAt":
                    ordered = desc
                        ? query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
                        : query.OrderBy(x => x.CreatedAt).ThenBy(x => x.Id);
                    break;

                case "confirmedAt":
                    ordered = desc
                        ? query.OrderByDescending(x => x.ConfirmedAt).ThenByDescending(x => x.Id)
                        : query.OrderBy(x => x.ConfirmedAt).ThenBy(x => x.Id);
                    break;

                case "status":
                    ordered = desc
                        ? query.OrderByDescending(x => x.Status).ThenByDescending(x => x.Id)
                        : query.OrderBy(x => x.Status).ThenBy(x => x.Id);
                    break;

                case "type":
                    ordered = desc
                        ? query.OrderByDescending(x => x.Type).ThenByDescending(x => x.Id)
                        : query.OrderBy(x => x.Type).ThenBy(x => x.Id);
                    break;

                default:
                    ordered = desc
                        ? query.OrderByDescending(x => x.DispatchDate).ThenByDescending(x => x.Id)
                        : query.OrderBy(x => x.DispatchDate).ThenBy(x => x.Id);
                    break;
            }

            var items = await ordered
                .Skip((q.Page - 1) * q.PageSize)
                .Take(q.PageSize)
                .ToListAsync();

            return new PagedResult<DispatchSlipListItemDto>
            {
                Page = q.Page,
                PageSize = q.PageSize,
                TotalItems = total,
                Items = items
            };
        }


        public async Task<List<CustomerLookupDto>> GetCustomersAsync(string? search)
        {
            var customerRoleId = await _db.Roles
                .Where(r => EF.Functions.ILike(r.Name, "customer"))
                .Select(r => r.RoleId)
                .FirstOrDefaultAsync();

            if (customerRoleId == 0)
                return new List<CustomerLookupDto>();

            var q = _db.Users
                .AsNoTracking()
                .Where(u => u.RoleId == customerRoleId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var pattern = $"%{search.Trim()}%";

                q = q.Where(u =>
                    EF.Functions.ILike(u.Name, pattern) ||
                    EF.Functions.ILike(u.Email, pattern));
            }

            var items = await q
                .OrderBy(u => u.Name)
                .Take(50)
                .Select(u => new CustomerLookupDto
                {
                    Id = u.UserID,
                    Name = u.Name
                })
                .ToListAsync();

            return items;
        }

        public async Task<List<ProjectLookupDto>> GetProjectsAsync(string? search)
        {
            var q = _db.Projects.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(p => p.Name.ToLower().Contains(s));
            }

            return await q
                .OrderBy(p => p.Name)
                .Select(p => new ProjectLookupDto
                {
                    Id = p.Id,
                    Name = p.Name
                })
                .ToListAsync();
        }
        public async Task<RetailDispatch> CreateSalesDispatchAsync(RetailDispatchCreateDto dto)
        {
            if (!(dto.CustomerId is > 0))
                throw new ArgumentException("Vui lòng điền Customer ID");

            if (dto.Items == null || dto.Items.Count == 0)
                throw new ArgumentException("Phiếu xuất bán phải có ít nhất 1 sản phẩm");

            var customerRoleId = await _db.Roles
                .Where(r => r.Name.ToLower() == "customer")
                .Select(r => r.RoleId)
                .FirstOrDefaultAsync();

            if (customerRoleId == 0)
                throw new KeyNotFoundException("Không tìm thấy customer");

            var customer = await _db.Users
                .FirstOrDefaultAsync(u => u.UserID == dto.CustomerId && u.RoleId == customerRoleId);

            if (customer == null)
                throw new KeyNotFoundException($"Customer {dto.CustomerId} không tìm thấy hoặc không có khách hàng nào");

            var slip = new RetailDispatch
            {
                DispatchDate = dto.DispatchDate,
                CustomerId = customer.UserID,
                CustomerName = customer.Name,
                Note = dto.Note?.Trim(),
                Status = DispatchStatus.Draft
            };

            _db.Set<RetailDispatch>().Add(slip);
            await _db.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(dto.SalesOrderNo))
            {
                slip.ReferenceNo = dto.SalesOrderNo!.Trim();
            }
            else
            {
                slip.ReferenceNo = $"DSP-SLS-{slip.Id:D5}";
            }

            await _db.SaveChangesAsync();

            foreach (var it in dto.Items)
            {
                if (!it.ProductId.HasValue || it.ProductId.Value <= 0)
                    continue;

                var product = await _db.Products
                    .Where(p => p.ProductID == it.ProductId.Value)
                    .Select(p => new { p.ProductID, p.ProductCode, p.ProductName })
                    .FirstOrDefaultAsync();

                if (product == null)
                    continue;

                var item = new DispatchItem
                {
                    DispatchId = slip.Id,
                    ProductId = product.ProductID,
                    ProductName = string.IsNullOrWhiteSpace(it.ProductName)
                        ? product.ProductName
                        : it.ProductName,
                    Uom = string.IsNullOrWhiteSpace(it.Uom) ? "pcs" : it.Uom,
                    Quantity = it.Quantity,
                    UnitPrice = it.UnitPrice,
                    Total = it.Quantity * it.UnitPrice
                };

                _db.DispatchItems.Add(item);
            }

            await _db.SaveChangesAsync();

            return slip;
        }

        public async Task<ProjectDispatch> CreateProjectDispatchAsync(ProjectDispatchCreateDto dto)
        {
            if (!(dto.ProjectId is > 0))
                throw new ArgumentException("ProjectID không tìm thấy");

            if (dto.Items == null || dto.Items.Count == 0)
                throw new ArgumentException("Phiếu xuất dự án phải có ít nhất 1 sản phẩm");

            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.Id == dto.ProjectId);

            if (project == null)
                throw new KeyNotFoundException($"ProjectID {dto.ProjectId} không tìm thấy");

            var slip = new ProjectDispatch
            {
                DispatchDate = dto.DispatchDate,
                ProjectId = project.Id,
                ProjectName = project.Name,
                Note = dto.Note?.Trim(),
                Status = DispatchStatus.Draft
            };

            _db.Set<ProjectDispatch>().Add(slip);
            await _db.SaveChangesAsync();

            slip.ReferenceNo = $"DSP-PRJ-{slip.Id:D5}";
            await _db.SaveChangesAsync();

            foreach (var it in dto.Items)
            {
                if (!it.ProductId.HasValue || it.ProductId.Value <= 0)
                    continue;

                var product = await _db.Products
                    .Where(p => p.ProductID == it.ProductId.Value)
                    .Select(p => new { p.ProductID, p.ProductCode, p.ProductName })
                    .FirstOrDefaultAsync();

                if (product == null)
                    continue;

                var item = new DispatchItem
                {
                    DispatchId = slip.Id,
                    ProductId = product.ProductID,
                    ProductName = string.IsNullOrWhiteSpace(it.ProductName)
                        ? product.ProductName
                        : it.ProductName,
                    Uom = string.IsNullOrWhiteSpace(it.Uom) ? "pcs" : it.Uom,
                    Quantity = it.Quantity,
                    UnitPrice = it.UnitPrice,
                    Total = it.Quantity * it.UnitPrice
                };

                _db.DispatchItems.Add(item);
            }

            await _db.SaveChangesAsync();

            return slip;
        }

        public async Task<DispatchSlipDetailDto?> GetDispatchByIdAsync(int id)
        {
            var s = await _db.Set<RetailDispatch>()
                             .FirstOrDefaultAsync(x => x.Id == id) as DispatchBase
                    ?? await _db.Set<ProjectDispatch>()
                                .FirstOrDefaultAsync(x => x.Id == id);

            if (s == null) return null;

            return new DispatchSlipDetailDto
            {
                Id = s.Id,
                ReferenceNo = s.ReferenceNo,
                Type = s.Type,
                Status = s.Status,
                DispatchDate = s.DispatchDate,
                Note = s.Note,
                CustomerName = (s is RetailDispatch r) ? r.CustomerName : null,
                CustomerId = (s is RetailDispatch r2) ? r2.CustomerId : null,
                ProjectName = (s is ProjectDispatch p) ? p.ProjectName : null,
                ProjectId = (s is ProjectDispatch p2) ? p2.ProjectId : null
            };
        }

        public async Task<PagedResult<DispatchItemListItemDto>> GetDispatchItemsAsync(
            int id,
            DispatchItemListQuery q)
        {
            if (q.Page <= 0) q.Page = 1;
            if (q.PageSize <= 0 || q.PageSize > 200) q.PageSize = 10;

            var exists = await _db.Dispatches.AnyAsync(d => d.Id == id);
            if (!exists)
                throw new KeyNotFoundException($"Dispatch {id} không tồn tại");

            var baseQuery = _db.DispatchItems
                               .Where(i => i.DispatchId == id);

            var total = await baseQuery.CountAsync();

            var items = await baseQuery
                .OrderBy(i => i.Id)
                .Join(_db.Products,
                      i => i.ProductId,
                      p => p.ProductID,
                      (i, p) => new DispatchItemListItemDto
                      {
                          Id = i.Id,
                          DispatchId = i.DispatchId,
                          ProductId = i.ProductId,
                          ProductName = i.ProductName,
                          ProductCode = p.ProductCode,
                          Uom = i.Uom,
                          Quantity = i.Quantity,
                          UnitPrice = i.UnitPrice,
                          Total = i.Total
                      })
                .Skip((q.Page - 1) * q.PageSize)
                .Take(q.PageSize)
                .ToListAsync();

            return new PagedResult<DispatchItemListItemDto>
            {
                Page = q.Page,
                PageSize = q.PageSize,
                TotalItems = total,
                Items = items
            };
        }
        public async Task<DispatchItemResultDto> CreateDispatchItemAsync(int dispatchId, DispatchItemDto dto)
        {
            var dispatch = await _db.Dispatches.FindAsync(dispatchId);
            if (dispatch == null)
                throw new KeyNotFoundException($"Dispatch {dispatchId} không tồn tại");

            if (string.IsNullOrWhiteSpace(dto.ProductName))
                throw new ArgumentException("Tên sản phẩm không được để trống");
            if (dto.Quantity <= 0)
                throw new ArgumentException("Số lượng phải lớn hơn 0");
            if (dto.ProductId == null)
                throw new ArgumentException("ProductId không được để trống");

            var product = await _db.Products
                .Where(p => p.ProductID == dto.ProductId)
                .Select(p => new { p.ProductCode })
                .FirstOrDefaultAsync();

            var item = new DispatchItem
            {
                DispatchId = dispatchId,
                ProductId = dto.ProductId.Value,
                ProductName = dto.ProductName,
                Uom = dto.Uom ?? "pcs",
                Quantity = dto.Quantity,
                UnitPrice = dto.UnitPrice,
                Total = dto.Quantity * dto.UnitPrice
            };

            _db.DispatchItems.Add(item);
            await _db.SaveChangesAsync();

            return new DispatchItemResultDto
            {
                Id = item.Id,
                DispatchId = item.DispatchId,
                ProductId = item.ProductId,
                ProductName = item.ProductName,
                ProductCode = product?.ProductCode ?? string.Empty,
                Uom = item.Uom,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                Total = item.Total
            };
        }

        public async Task<(DispatchItem item, string productCode)> UpdateDispatchItemAsync(int itemId, DispatchItemDto dto)
        {
            var item = await _db.DispatchItems
                .Include(i => i.Dispatch)
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item == null)
                throw new KeyNotFoundException($"Item {itemId} không tồn tại");

            if (item.Dispatch.Status != DispatchStatus.Draft)
                throw new InvalidOperationException("Chỉ phiếu ở trạng thái Nháp mới được chỉnh sửa");

            if (string.IsNullOrWhiteSpace(dto.ProductName))
                throw new ArgumentException("Tên sản phẩm không được để trống");

            if (dto.Quantity <= 0)
                throw new ArgumentException("Số lượng phải lớn hơn 0");

            if (dto.UnitPrice < 0)
                throw new ArgumentException("Đơn giá không được âm");

            if (!dto.ProductId.HasValue || dto.ProductId.Value <= 0)
                throw new ArgumentException("ProductId không được để trống và phải > 0");

            var product = await _db.Products
                .Where(p => p.ProductID == dto.ProductId.Value)
                .Select(p => new { p.ProductID, p.ProductCode, p.ProductName })
                .FirstOrDefaultAsync();

            if (product == null)
                throw new ArgumentException($"Sản phẩm với ID {dto.ProductId} không tồn tại");

            item.ProductId = product.ProductID;
            item.ProductName = dto.ProductName.Trim();
            item.Uom = string.IsNullOrWhiteSpace(dto.Uom) ? "pcs" : dto.Uom;
            item.Quantity = dto.Quantity;
            item.UnitPrice = dto.UnitPrice;
            item.Total = dto.Quantity * dto.UnitPrice;

            await _db.SaveChangesAsync();

            var productCode = product.ProductCode ?? string.Empty;

            return (item, productCode);
        }

        public async Task DeleteDispatchSlipAsync(int id)
        {
            var slip = await _db.Dispatches
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (slip == null)
                throw new KeyNotFoundException("Phiếu xuất không tìm thấy");

            if (slip.Status != DispatchStatus.Draft)
                throw new InvalidOperationException("Chỉ bản nháp mới được xóa");

            _db.DispatchItems.RemoveRange(slip.Items);
            slip.IsDeleted = true;

            await _db.SaveChangesAsync();
        }

        public async Task DeleteDispatchItemAsync(int itemId)
        {
            var item = await _db.DispatchItems.FindAsync(itemId);
            if (item == null)
                throw new KeyNotFoundException($"Item {itemId} không tồn tại");

            _db.DispatchItems.Remove(item);
            await _db.SaveChangesAsync();
        }

        public async Task<byte[]> ExportDispatchSlipsAsync(List<int> ids, bool includeItems)
        {
            if (ids == null || ids.Count == 0)
                throw new ArgumentException("Không có phiếu xuất để export.");

            var sales = _db.Set<RetailDispatch>()
                .Where(x => ids.Contains(x.Id))
                .Select(x => new DispatchSlipListItemDto
                {
                    Id = x.Id,
                    Type = "Sales",
                    ReferenceNo = x.ReferenceNo,
                    SalesOrderNo = x.ReferenceNo,
                    RequestNo = null,
                    CustomerName = x.CustomerName,
                    ProjectName = null,
                    DispatchDate = x.DispatchDate,
                    Status = x.Status,
                    CreatedAt = x.CreatedAt,
                    ConfirmedAt = x.ConfirmedAt,
                    Note = x.Note
                });

            var projects = _db.Set<ProjectDispatch>()
                .Where(x => ids.Contains(x.Id))
                .Select(x => new DispatchSlipListItemDto
                {
                    Id = x.Id,
                    Type = "Project",
                    ReferenceNo = x.ReferenceNo,
                    SalesOrderNo = null,
                    RequestNo = x.ReferenceNo,
                    CustomerName = null,
                    ProjectName = x.ProjectName,
                    DispatchDate = x.DispatchDate,
                    Status = x.Status,
                    CreatedAt = x.CreatedAt,
                    ConfirmedAt = x.ConfirmedAt,
                    Note = x.Note
                });

            var slips = await sales.Concat(projects)
                .OrderBy(x => x.DispatchDate)
                .ThenBy(x => x.Id)
                .ToListAsync();

            using var wb = new XLWorkbook();

            var wsSlips = wb.Worksheets.Add("DispatchSlips");
            int row = 1;

            wsSlips.Cell(row, 1).Value = "ID";
            wsSlips.Cell(row, 2).Value = "Mã phiếu";
            wsSlips.Cell(row, 3).Value = "Loại";
            wsSlips.Cell(row, 4).Value = "Đơn bán / Yêu cầu";
            wsSlips.Cell(row, 5).Value = "Khách hàng";
            wsSlips.Cell(row, 6).Value = "Dự án";
            wsSlips.Cell(row, 7).Value = "Ngày xuất";
            wsSlips.Cell(row, 8).Value = "Trạng thái";
            wsSlips.Cell(row, 9).Value = "Ngày tạo";
            wsSlips.Cell(row, 10).Value = "Ngày xác nhận";
            wsSlips.Cell(row, 11).Value = "Ghi chú";

            wsSlips.Range(row, 1, row, 11).Style.Font.Bold = true;
            row++;

            foreach (var s in slips)
            {
                wsSlips.Cell(row, 1).Value = s.Id;
                wsSlips.Cell(row, 2).Value = s.ReferenceNo;
                wsSlips.Cell(row, 3).Value = s.Type;
                wsSlips.Cell(row, 4).Value = s.SalesOrderNo ?? s.RequestNo;
                wsSlips.Cell(row, 5).Value = s.CustomerName ?? "";
                wsSlips.Cell(row, 6).Value = s.ProjectName ?? "";
                wsSlips.Cell(row, 7).Value = s.DispatchDate;
                wsSlips.Cell(row, 8).Value = s.Status.ToString();
                wsSlips.Cell(row, 9).Value = s.CreatedAt;
                wsSlips.Cell(row, 10).Value = s.ConfirmedAt;
                wsSlips.Cell(row, 11).Value = s.Note ?? "";
                row++;
            }

            wsSlips.Columns().AdjustToContents();

            if (includeItems)
            {
                var itemRows = await _db.DispatchItems
                    .Where(i => ids.Contains(i.DispatchId))
                    .Join(_db.Products,
                        i => i.ProductId,
                        p => p.ProductID,
                        (i, p) => new
                        {
                            Item = i,
                            ProductCode = p.ProductCode
                        })
                    .ToListAsync();

                var wsItems = wb.Worksheets.Add("DispatchItems");
                int r2 = 1;

                wsItems.Cell(r2, 1).Value = "Mã phiếu xuất";
                wsItems.Cell(r2, 2).Value = "ID sản phẩm";
                wsItems.Cell(r2, 3).Value = "Mã sản phẩm";
                wsItems.Cell(r2, 4).Value = "Tên sản phẩm";
                wsItems.Cell(r2, 5).Value = "Đơn vị";
                wsItems.Cell(r2, 6).Value = "Số lượng";
                wsItems.Cell(r2, 7).Value = "Đơn giá";
                wsItems.Cell(r2, 8).Value = "Thành tiền";

                wsItems.Range(r2, 1, r2, 8).Style.Font.Bold = true;
                r2++;

                foreach (var x in itemRows)
                {
                    wsItems.Cell(r2, 1).Value = x.Item.DispatchId;
                    wsItems.Cell(r2, 2).Value = x.Item.Id;
                    wsItems.Cell(r2, 3).Value = x.ProductCode;
                    wsItems.Cell(r2, 4).Value = x.Item.ProductName;
                    wsItems.Cell(r2, 5).Value = x.Item.Uom;
                    wsItems.Cell(r2, 6).Value = x.Item.Quantity;
                    wsItems.Cell(r2, 7).Value = x.Item.UnitPrice;
                    wsItems.Cell(r2, 8).Value = x.Item.Total;
                    r2++;
                }

                wsItems.Columns().AdjustToContents();
            }

            using var stream = new MemoryStream();
            wb.SaveAs(stream);
            return stream.ToArray();
        }

        public async Task<byte[]> ExportDispatchSlipPdfAsync(int id)
        {
            var slip = await _db.Dispatches
                .Include(d => d.Items)
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (slip == null)
                throw new KeyNotFoundException($"Phiếu xuất {id} không tồn tại");

            if (slip.Items == null || slip.Items.Count == 0)
                throw new InvalidOperationException("Phiếu xuất không có sản phẩm");

            var isRetail = slip is RetailDispatch;
            var receiverName = isRetail
                ? ((RetailDispatch)slip).CustomerName
                : (slip as ProjectDispatch)?.ProjectName ?? "";

            var noiDung = isRetail ? "Xuất đơn bán lẻ" : "Xuất đơn dự án";

            var productIds = slip.Items
                .Where(i => i.ProductId.HasValue)
                .Select(i => i.ProductId!.Value)
                .Distinct()
                .ToList();

            var productCodes = await _db.Products
                .Where(p => productIds.Contains(p.ProductID))
                .ToDictionaryAsync(p => p.ProductID, p => p.ProductCode);

            var rows = slip.Items
                .OrderBy(i => i.Id)
                .Select((i, index) => new
                {
                    Stt = index + 1,
                    Code = i.ProductId.HasValue && productCodes.TryGetValue(i.ProductId.Value, out var code)
                        ? code
                        : string.Empty,
                    Name = i.ProductName,
                    Uom = i.Uom,
                    Qty = i.Quantity
                })
                .ToList();

            var d = slip.DispatchDate.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(slip.DispatchDate, DateTimeKind.Utc).ToLocalTime()
                : slip.DispatchDate.ToLocalTime();

            var logoPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "saokim-logo.jpg");
            byte[]? logoBytes = null;
            if (File.Exists(logoPath))
            {
                logoBytes = File.ReadAllBytes(logoPath);
            }

            var pdfBytes = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(30);
                    page.Size(PageSizes.A4);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(11));

                    page.Header().Element(header =>
                    {
                        header.ShowOnce().Column(col =>
                        {
                            col.Item().Row(row =>
                            {
                                row.Spacing(10);

                                row.ConstantItem(110).Height(60).Element(e =>
                                {
                                    if (logoBytes != null)
                                        e.Image(logoBytes);
                                });

                                row.RelativeItem().Column(c =>
                                {
                                    c.Item().Text("CÔNG TY TNHH THƯƠNG MẠI VÀ KỸ THUẬT SAO KIM")
                                        .SemiBold().FontSize(11);
                                    c.Item().Text("Số 40 ngõ 168 Nguyễn Xiển, P. Hạ Đình, Q. Thanh Xuân, TP. Hà Nội");
                                    c.Item().Text("VPĐD: B44-24 Khu B KĐT mới Gleximco, đường Lê Trọng Tấn, P. Dương Nội, Q. Hà Đông, TP. Hà Nội");
                                    c.Item().Text("Điện thoại: 0243.274.7089    Fax: 0243.274.7090");
                                    c.Item().Text("Website: www.ske.com.vn    Email: info@ske.com.vn");
                                    c.Item().Text("Tài khoản NH: 0909 222 5668 - Tại Ngân hàng Tiên Phong (TPBANK) - CN Trung Hòa");
                                });
                            });

                            col.Item().PaddingTop(10).AlignCenter().Text("PHIẾU GIAO HÀNG")
                                .FontSize(16).SemiBold();

                            col.Item().AlignCenter().Text(text =>
                            {
                                text.Span($"Ngày {d:dd} tháng {d:MM} năm {d:yyyy}   ");
                                text.Span($"Số: {slip.ReferenceNo}");
                            });
                        });
                    });

                    page.Content().Element(content =>
                    {
                        content.Column(col =>
                        {
                            col.Spacing(8);

                            col.Item().Text($"Khách hàng/Dự án: {receiverName}");
                            col.Item().Text($"Nội dung: {noiDung}");

                            col.Item().Table(table =>
                            {
                                table.ColumnsDefinition(cols =>
                                {
                                    cols.RelativeColumn(0.7f);  
                                    cols.RelativeColumn(1.5f);  
                                    cols.RelativeColumn(4f);   
                                    cols.RelativeColumn(1.2f);
                                    cols.RelativeColumn(1.2f);  
                                    cols.RelativeColumn(2f);   
                                });

                                table.Header(h =>
                                {
                                    h.Cell().Border(1).Padding(3).AlignCenter().Text("Stt").SemiBold();
                                    h.Cell().Border(1).Padding(3).AlignCenter().Text("Mã hàng").SemiBold();
                                    h.Cell().Border(1).Padding(3).AlignCenter().Text("Tên hàng").SemiBold();
                                    h.Cell().Border(1).Padding(3).AlignCenter().Text("Đvt").SemiBold();
                                    h.Cell().Border(1).Padding(3).AlignCenter().Text("Số lượng").SemiBold();
                                    h.Cell().Border(1).Padding(3).AlignCenter().Text("Ghi chú").SemiBold();
                                });

                                foreach (var r in rows)
                                {
                                    table.Cell().Border(1).Padding(3).AlignCenter().Text(r.Stt.ToString());
                                    table.Cell().Border(1).Padding(3).Text(r.Code ?? "");
                                    table.Cell().Border(1).Padding(3).Text(r.Name ?? "");
                                    table.Cell().Border(1).Padding(3).AlignCenter().Text(r.Uom ?? "");
                                    table.Cell().Border(1).Padding(3).AlignRight().Text(r.Qty.ToString());
                                    table.Cell().Border(1).Padding(3).Text("");
                                }
                            });

                            if (!string.IsNullOrWhiteSpace(slip.Note))
                            {
                                col.Item().PaddingTop(10).Text($"Ghi chú: {slip.Note}");
                            }

                            col.Item().EnsureSpace(260).Element(section =>
                            {
                                section.Column(c =>
                                {
                                    c.Item()
                                        .AlignRight()
                                        .Text("Ngày        tháng        năm        ");

                                    c.Item().PaddingTop(10).Row(row =>
                                    {
                                        row.RelativeItem().AlignCenter().Column(cc =>
                                        {
                                            cc.Item().Text("NGƯỜI GIAO HÀNG").SemiBold();
                                            cc.Item().Text("(Ký, họ tên)").FontSize(10);
                                        });

                                        row.RelativeItem().AlignCenter().Column(cc =>
                                        {
                                            cc.Item().Text("NGƯỜI NHẬN HÀNG").SemiBold();
                                            cc.Item().Text("(Ký, họ tên)").FontSize(10);
                                        });
                                    });

                                    c.Item().PaddingTop(25).Column(ghi =>
                                    {
                                        ghi.Item().AlignCenter().Text("GHI CHÚ:").SemiBold();
                                        ghi.Item().Text("- Đề nghị Quý khách kiểm tra chất lượng, số lượng hàng hóa trước khi ký nhận hàng;");
                                        ghi.Item().Text("- Chúng tôi sẽ không chịu trách nhiệm khiếu nại về việc thiếu, bể... khi khách hàng đã xác nhận;");
                                        ghi.Item().Text("- Bảo hành sản phẩm theo Quy định của Công ty;");
                                    });
                                });
                            });
                        });
                    });
                });
            }).GeneratePdf();

            return pdfBytes;
        }
    }
}