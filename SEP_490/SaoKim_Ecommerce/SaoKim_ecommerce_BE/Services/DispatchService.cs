using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

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

            var customerRoleId = await _db.Roles
                .Where(r => EF.Functions.ILike(r.Name, "customer"))
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

            slip.ReferenceNo = $"DSP-SLS-{slip.Id:D5}";
            await _db.SaveChangesAsync();

            return slip;
        }
        public async Task<ProjectDispatch> CreateProjectDispatchAsync(ProjectDispatchCreateDto dto)
        {
            if (!(dto.ProjectId is > 0))
                throw new ArgumentException("ProjectID không tìm thấy");

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
                throw new KeyNotFoundException("Dispatch slip not found");

            if (slip.Status != DispatchStatus.Draft)
                throw new InvalidOperationException("Only Draft slips can be deleted");

            _db.DispatchItems.RemoveRange(slip.Items);
            _db.Dispatches.Remove(slip);

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

    }
}