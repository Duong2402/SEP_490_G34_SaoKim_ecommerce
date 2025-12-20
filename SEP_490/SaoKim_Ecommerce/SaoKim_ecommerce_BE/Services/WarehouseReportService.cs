using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services.Realtime;

namespace SaoKim_ecommerce_BE.Services
{
    public class WarehouseReportService : IWarehouseReportService
    {
        private readonly SaoKimDBContext _db;
        private readonly IRealtimePublisher _rt;

        public WarehouseReportService(SaoKimDBContext db, IRealtimePublisher rt)
        {
            _db = db;
            _rt = rt;
        }

        public async Task<List<InboundReportDto>> GetInboundReportAsync(InboundReportQuery q)
        {
            var query = _db.ReceivingSlips
                .Include(s => s.Items)
                .Where(d => d.Status == ReceivingSlipStatus.Confirmed)
                .Where(s => !s.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(q.Supplier))
            {
                var supplier = q.Supplier.Trim();
                query = query.Where(s => s.Supplier.Contains(supplier));
            }

            if (!string.IsNullOrWhiteSpace(q.Project))
            {
                var project = q.Project.Trim();
                query = query.Where(s => s.Note != null && s.Note.Contains(project));
            }

            if (!string.IsNullOrWhiteSpace(q.Source))
            {
                var source = q.Source.Trim();
                query = query.Where(s => s.Note != null && s.Note.Contains(source));
            }

            if (q.FromDate.HasValue)
            {
                var fromLocal = q.FromDate.Value.Date;
                var fromUtc = DateTime.SpecifyKind(fromLocal, DateTimeKind.Local).ToUniversalTime();
                query = query.Where(s => s.ReceiptDate >= fromUtc);
            }

            if (q.ToDate.HasValue)
            {
                var toLocalExclusive = q.ToDate.Value.Date.AddDays(1);
                var toUtcExclusive = DateTime.SpecifyKind(toLocalExclusive, DateTimeKind.Local)
                    .ToUniversalTime();
                query = query.Where(s => s.ReceiptDate < toUtcExclusive);
            }

            var result = await query
                .Select(s => new InboundReportDto
                {
                    Supplier = s.Supplier,
                    Project = null,
                    Source = null,
                    ReceiptDate = s.ReceiptDate,
                    TotalItems = s.Items.Count,
                    TotalQuantity = s.Items.Sum(i => (decimal)i.Quantity),
                    TotalValue = s.Items.Sum(i => i.Total)
                })
                .OrderByDescending(x => x.ReceiptDate)
                .ToListAsync();

            return result;
        }

        public async Task<List<OutboundReportDto>> GetOutboundReportAsync(OutboundReportQuery q)
        {
            var query = _db.Dispatches
                .Include(d => d.Items)
                .Where(d => d.Status == DispatchStatus.Confirmed)
                .Where(s => !s.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(q.Destination))
            {
                var dest = q.Destination.Trim();
                query = query.Where(d => d.Note != null && d.Note.Contains(dest));
            }

            if (q.FromDate.HasValue)
            {
                var fromLocal = q.FromDate.Value.Date;
                var fromUtc = DateTime.SpecifyKind(fromLocal, DateTimeKind.Local).ToUniversalTime();
                query = query.Where(d => d.DispatchDate >= fromUtc);
            }

            if (q.ToDate.HasValue)
            {
                var toLocalExclusive = q.ToDate.Value.Date.AddDays(1);
                var toUtcExclusive = DateTime.SpecifyKind(toLocalExclusive, DateTimeKind.Local).ToUniversalTime();
                query = query.Where(d => d.DispatchDate < toUtcExclusive);
            }

            var list = await query.ToListAsync();

            IEnumerable<DispatchBase> filtered = list;

            if (!string.IsNullOrWhiteSpace(q.Customer))
            {
                var customer = q.Customer.Trim();
                filtered = filtered.Where(d =>
                    d is RetailDispatch rd &&
                    rd.CustomerName.Contains(customer));
            }

            if (!string.IsNullOrWhiteSpace(q.Project))
            {
                var project = q.Project.Trim();
                filtered = filtered.Where(d =>
                    d is ProjectDispatch pd &&
                    pd.ProjectName.Contains(project));
            }

            var result = filtered
                .Select(d => new OutboundReportDto
                {
                    CustomerName = d is RetailDispatch rd ? rd.CustomerName : null,
                    ProjectName = d is ProjectDispatch pd ? pd.ProjectName : null,
                    ReferenceNo = d.ReferenceNo,

                    IssueDate = d.DispatchDate,
                    Note = d.Note,
                    TotalItems = d.Items.Count,
                    TotalQuantity = d.Items.Sum(i => i.Quantity),
                    TotalValue = d.Items.Sum(i => i.Total)
                })
                .OrderByDescending(x => x.IssueDate)
                .ToList();

            return result;
        }

        public async Task<WeeklyInboundSummaryDto> GetWeeklyInboundSummaryAsync()
        {
            var today = DateTime.UtcNow.Date;
            int isoDayOfWeek = ((int)today.DayOfWeek == 0) ? 7 : (int)today.DayOfWeek;

            var startOfThisWeek = today.AddDays(-(isoDayOfWeek - 1));
            var startOfLastWeek = startOfThisWeek.AddDays(-7);
            var endOfLastWeek = startOfThisWeek;

            var thisWeekTotal = await _db.ReceivingSlips
                .Where(s =>
                    s.Status == ReceivingSlipStatus.Confirmed &&
                    s.ReceiptDate >= startOfThisWeek)
                .CountAsync();

            var lastWeekTotal = await _db.ReceivingSlips
                .Where(s =>
                    s.Status == ReceivingSlipStatus.Confirmed &&
                    s.ReceiptDate >= startOfLastWeek &&
                    s.ReceiptDate < endOfLastWeek)
                .CountAsync();

            return new WeeklyInboundSummaryDto
            {
                ThisWeek = thisWeekTotal,
                LastWeek = lastWeekTotal
            };
        }

        public async Task<WeeklySummaryDto> GetWeeklyOutboundSummaryAsync()
        {
            var today = DateTime.UtcNow.Date;
            int isoDayOfWeek = ((int)today.DayOfWeek == 0) ? 7 : (int)today.DayOfWeek;

            var startOfThisWeek = today.AddDays(-(isoDayOfWeek - 1));
            var startOfLastWeek = startOfThisWeek.AddDays(-7);
            var endOfLastWeek = startOfThisWeek;

            var thisWeekTotal = await _db.Dispatches
                .Where(d =>
                    d.Status == DispatchStatus.Confirmed &&
                    d.DispatchDate >= startOfThisWeek)
                .CountAsync();

            var lastWeekTotal = await _db.Dispatches
                .Where(d =>
                    d.Status == DispatchStatus.Confirmed &&
                    d.DispatchDate >= startOfLastWeek &&
                    d.DispatchDate < endOfLastWeek)
                .CountAsync();

            return new WeeklySummaryDto
            {
                ThisWeek = thisWeekTotal,
                LastWeek = lastWeekTotal
            };
        }

        public async Task<TotalStockDto> GetTotalStockAsync()
        {
            var latestSnapshots =
                from ss in _db.InventoryStockSnapshots.AsNoTracking()
                group ss by ss.ProductId into g
                select new { ProductId = g.Key, SnapshotAt = g.Max(x => x.SnapshotAt) };

            var latestOnHandQuery =
                from ls in latestSnapshots
                join ss in _db.InventoryStockSnapshots.AsNoTracking()
                    on new { ls.ProductId, ls.SnapshotAt } equals new { ProductId = ss.ProductId, SnapshotAt = ss.SnapshotAt }
                select ss.OnHand;

            var hasAnySnapshot = await _db.InventoryStockSnapshots.AsNoTracking().AnyAsync();

            decimal total;
            if (hasAnySnapshot)
            {
                total = await latestOnHandQuery.SumAsync();
            }
            else
            {
                total = await _db.ProductDetails.SumAsync(d => (decimal)d.Quantity);
            }

            return new TotalStockDto { TotalStock = total };
        }

        public async Task<List<UnitOfMeasureDto>> GetUnitOfMeasuresAsync()
        {
            var list = await _db.UnitOfMeasures
                .Where(u => u.Status == "Active")
                .OrderBy(u => u.Name)
                .Select(u => new UnitOfMeasureDto
                {
                    Id = u.Id,
                    Name = u.Name
                })
                .ToListAsync();

            return list;
        }

        public async Task<PagedResult<InventoryListItemDto>> GetInventoryAsync(InventoryListQuery q)
        {
            if (q.Page <= 0) q.Page = 1;
            if (q.PageSize <= 0 || q.PageSize > 200) q.PageSize = 10;

            var productQuery = _db.Products.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(q.Search))
            {
                var s = q.Search.Trim().ToLower();
                productQuery = productQuery.Where(p =>
                    (p.ProductCode ?? "").ToLower().Contains(s) ||
                    p.ProductName.ToLower().Contains(s));
            }

            var latestDetailIds =
                from d in _db.ProductDetails.AsNoTracking()
                where d.Status == null || d.Status == "Active"
                group d by d.ProductID into g
                select new
                {
                    ProductID = g.Key,
                    MaxId = g.Max(x => x.Id)
                };

            var latestDetails =
                from d in _db.ProductDetails.AsNoTracking()
                join mx in latestDetailIds
                    on new { d.ProductID, d.Id } equals new { mx.ProductID, Id = mx.MaxId }
                select new
                {
                    d.ProductID,
                    d.Unit,
                    Qty = (int?)d.Quantity // ép nullable “thô”
                };

            // QUAN TRỌNG: baseQuery chỉ lấy cột nullable, không cast/coalesce về non-nullable ở đây
            var baseQuery =
                from p in productQuery

                join d in latestDetails
                    on p.ProductID equals d.ProductID into dg
                from d in dg.DefaultIfEmpty()

                join th in _db.InventoryThresholds.AsNoTracking()
                    on p.ProductID equals th.ProductId into thg
                from th in thg.DefaultIfEmpty()

                select new
                {
                    ProductID = (int?)p.ProductID,
                    p.ProductCode,
                    p.ProductName,

                    Unit = d != null ? d.Unit : null,

                    // nullable
                    Quantity = d != null ? (decimal?)d.Qty : null,

                    // nullable (trong trường hợp th null)
                    MinStock = th != null ? (int?)th.MinStock : null
                };

            if (!string.IsNullOrWhiteSpace(q.Status) && q.Status != "all")
            {
                switch (q.Status)
                {
                    case "critical":
                        baseQuery = baseQuery.Where(x => (x.Quantity ?? 0m) <= 0m);
                        break;

                    case "alert":
                        baseQuery = baseQuery.Where(x =>
                            (x.MinStock ?? 0) > 0 &&
                            (x.Quantity ?? 0m) > 0m &&
                            (x.Quantity ?? 0m) < (x.MinStock ?? 0));
                        break;

                    case "stock":
                        baseQuery = baseQuery.Where(x =>
                            (x.MinStock ?? 0) == 0 ||
                            (x.Quantity ?? 0m) >= (x.MinStock ?? 0));
                        break;
                }
            }

            var total = await baseQuery.CountAsync();

            var rawPage = await baseQuery
                .OrderBy(x => x.ProductName)
                .ThenBy(x => x.ProductCode)
                .Skip((q.Page - 1) * q.PageSize)
                .Take(q.PageSize)
                .ToListAsync();

            var pageItems = rawPage.Select(x => new InventoryListItemDto
            {
                ProductId = x.ProductID ?? 0,
                ProductCode = x.ProductCode,
                ProductName = x.ProductName,
                OnHand = x.Quantity ?? 0m,
                UomName = x.Unit,
                MinStock = x.MinStock ?? 0,
                Status = null,
                Note = null
            }).ToList();

            return new PagedResult<InventoryListItemDto>
            {
                Page = q.Page,
                PageSize = q.PageSize,
                TotalItems = total,
                Items = pageItems
            };
        }


        private static TimeZoneInfo GetAppTimeZone()
        {

            try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Bangkok"); }
            catch { }

            return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        }

        private static DateTime LocalDateStartToUtc(DateTime localDate, TimeZoneInfo tz)
        {
            var unspecified = DateTime.SpecifyKind(localDate, DateTimeKind.Unspecified);
            return TimeZoneInfo.ConvertTimeToUtc(unspecified, tz);
        }

        public async Task<PagedResult<InventoryReportItemDto>> GetInventoryReportAsync(InventoryListQuery q)
        {
            if (q.Page <= 0) q.Page = 1;
            if (q.PageSize <= 0 || q.PageSize > 200) q.PageSize = 10;

            var tz = GetAppTimeZone();

            var fromLocalDate = q.DateFrom?.Date;
            var toLocalDate = q.DateTo?.Date;

            if (!fromLocalDate.HasValue && !toLocalDate.HasValue)
            {
                toLocalDate = DateTime.Now.Date;
                fromLocalDate = toLocalDate.Value.AddDays(-6);
            }
            else if (!fromLocalDate.HasValue && toLocalDate.HasValue)
            {
                fromLocalDate = toLocalDate.Value.AddDays(-6);
            }
            else if (fromLocalDate.HasValue && !toLocalDate.HasValue)
            {
                toLocalDate = fromLocalDate.Value;
            }

            if (toLocalDate!.Value < fromLocalDate!.Value)
                throw new ArgumentException("Ngày đến phải lớn hơn hoặc bằng ngày bắt đầu.");

            var fromUtc = LocalDateStartToUtc(fromLocalDate.Value, tz);
            var toExclusiveUtc = LocalDateStartToUtc(toLocalDate.Value.AddDays(1), tz);

            var productQuery = _db.Products.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(q.Search))
            {
                var s = q.Search.Trim().ToLower();
                productQuery = productQuery.Where(p =>
                    (p.ProductCode ?? "").ToLower().Contains(s) ||
                    p.ProductName.ToLower().Contains(s));
            }

            var baseQuery =
                from p in productQuery
                join d in _db.ProductDetails.AsNoTracking()
                    on p.ProductID equals d.ProductID into dg
                from d in dg.DefaultIfEmpty()
                join th in _db.InventoryThresholds.AsNoTracking()
                    on p.ProductID equals th.ProductId into thg
                from th in thg.DefaultIfEmpty()
                where d == null || d.Status == "Active"
                select new
                {
                    p.ProductID,
                    p.ProductCode,
                    p.ProductName,
                    Unit = d != null ? d.Unit : null,
                    MinStock = (int?)th.MinStock ?? 0
                };

            var total = await baseQuery.CountAsync();

            var pageData = await baseQuery
                .OrderBy(x => x.ProductName)
                .ThenBy(x => x.ProductCode)
                .Skip((q.Page - 1) * q.PageSize)
                .Take(q.PageSize)
                .ToListAsync();

            var productIds = pageData.Select(x => x.ProductID).ToList();
            if (productIds.Count == 0)
            {
                return new PagedResult<InventoryReportItemDto>
                {
                    Page = q.Page,
                    PageSize = q.PageSize,
                    TotalItems = 0,
                    Items = Array.Empty<InventoryReportItemDto>()
                };
            }

            var inboundPeriodDict = await (
                from item in _db.ReceivingSlipItems.AsNoTracking()
                join slip in _db.ReceivingSlips.AsNoTracking()
                    on item.ReceivingSlipId equals slip.Id
                where item.ProductId != null
                      && productIds.Contains(item.ProductId.Value)
                      && slip.Status == ReceivingSlipStatus.Confirmed
                      && slip.ReceiptDate >= fromUtc
                      && slip.ReceiptDate < toExclusiveUtc
                group item by item.ProductId!.Value into g
                select new { ProductId = g.Key, Qty = g.Sum(x => (decimal)x.Quantity) }
            ).ToDictionaryAsync(x => x.ProductId, x => x.Qty);

            var outboundPeriodDict = await (
                from item in _db.DispatchItems.AsNoTracking()
                join slip in _db.Dispatches.AsNoTracking()
                    on item.DispatchId equals slip.Id
                where item.ProductId != null
                      && productIds.Contains(item.ProductId.Value)
                      && slip.Status == DispatchStatus.Confirmed
                      && slip.DispatchDate >= fromUtc
                      && slip.DispatchDate < toExclusiveUtc
                group item by item.ProductId!.Value into g
                select new { ProductId = g.Key, Qty = g.Sum(x => (decimal)x.Quantity) }
            ).ToDictionaryAsync(x => x.ProductId, x => x.Qty);

            var openingList = await _db.InventoryStockSnapshots.AsNoTracking()
                .Where(s => productIds.Contains(s.ProductId) && s.SnapshotAt < fromUtc)
                .OrderByDescending(s => s.SnapshotAt)
                .ThenByDescending(s => s.Id)
                .Select(s => new { s.ProductId, s.OnHand, s.SnapshotAt, s.Id })
                .ToListAsync();

            var closingList = await _db.InventoryStockSnapshots.AsNoTracking()
                .Where(s => productIds.Contains(s.ProductId) && s.SnapshotAt < toExclusiveUtc)
                .OrderByDescending(s => s.SnapshotAt)
                .ThenByDescending(s => s.Id)
                .Select(s => new { s.ProductId, s.OnHand, s.SnapshotAt, s.Id })
                .ToListAsync();

            var openingDict = openingList
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.First().OnHand);

            var closingDict = closingList
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.First().OnHand);

            var items = pageData.Select(x =>
            {
                var pid = x.ProductID;

                var opening = openingDict.TryGetValue(pid, out var op) ? op : 0m;
                var closing = closingDict.TryGetValue(pid, out var cl) ? cl : opening;

                var inbound = inboundPeriodDict.TryGetValue(pid, out var ip) ? ip : 0m;
                var outbound = outboundPeriodDict.TryGetValue(pid, out var ob) ? ob : 0m;

                var status =
                    x.MinStock <= 0 ? "stock"
                    : closing <= 0 ? "critical"
                    : closing < x.MinStock ? "alert"
                    : "stock";

                return new InventoryReportItemDto
                {
                    ProductId = pid,
                    ProductCode = x.ProductCode,
                    ProductName = x.ProductName,
                    UomName = x.Unit,
                    MinStock = x.MinStock,

                    OpeningQty = opening,
                    InboundQty = inbound,
                    OutboundQty = outbound,
                    ClosingQty = closing,

                    OnHand = closing,
                    Status = status,
                    Note = null
                };
            }).ToList();

            if (!string.IsNullOrWhiteSpace(q.Status) && q.Status != "all")
                items = items.Where(i => i.Status == q.Status).ToList();

            return new PagedResult<InventoryReportItemDto>
            {
                Page = q.Page,
                PageSize = q.PageSize,
                TotalItems = total,
                Items = items
            };
        }


        public async Task<InventoryThreshold> UpdateMinStockAsync(int productId, int minStock)
        {
            if (minStock < 0)
                throw new ArgumentException("Giá trị tối thiểu phải lớn hơn 0");

            var productExists = await _db.Products.AnyAsync(p => p.ProductID == productId);
            if (!productExists)
                throw new KeyNotFoundException("Sản phẩm không tìm thấy");

            var threshold = await _db.InventoryThresholds
                .FirstOrDefaultAsync(t => t.ProductId == productId);

            if (threshold == null)
            {
                threshold = new InventoryThreshold
                {
                    ProductId = productId,
                    MinStock = minStock,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.InventoryThresholds.Add(threshold);
            }
            else
            {
                threshold.MinStock = minStock;
                threshold.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            await _rt.PublishToWarehouseAsync("inventory.min_stock.updated", new
            {
                productId,
                minStock = threshold.MinStock,
                updatedAtUtc = threshold.UpdatedAt
            });

            return threshold;
        }

        public async Task<List<TraceSearchResultDto>> SearchTraceAsync(TraceSearchQuery q)
        {
            IQueryable<TraceIdentity> query = _db.TraceIdentities.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(q.Query))
            {
                var s = q.Query.Trim().ToLower();

                query = query.Where(i =>
                    i.IdentityCode.ToLower().Contains(s) ||
                    ((i.Product!.ProductCode ?? "").ToLower().Contains(s)) ||
                    i.Product!.ProductName.ToLower().Contains(s) ||
                    ((i.ProjectName ?? "").ToLower().Contains(s))
                );
            }

            query = query
                .Include(i => i.Product)
                .Include(i => i.Events);

            var items = await query
                .OrderByDescending(i => i.UpdatedAt)
                .Take(100)
                .Select(i => new TraceSearchResultDto
                {
                    Id = i.Id,
                    Serial = i.IdentityCode,
                    Sku = i.Product != null ? i.Product.ProductCode : null,
                    ProductName = i.Product != null ? i.Product.ProductName : null,
                    Status = i.Status,
                    Project = i.ProjectName,
                    CurrentLocation = i.CurrentLocation,
                    Timeline = i.Events
                        .OrderBy(e => e.OccurredAt)
                        .Select(e => new TraceEventDto
                        {
                            Time = e.OccurredAt,
                            Type = e.EventType,
                            Ref = e.RefCode,
                            Actor = e.Actor,
                            Note = e.Note
                        })
                        .ToList()
                })
                .ToListAsync();

            return items;
        }

        public async Task<ProductTraceDto?> GetProductTraceAsync(int productId)
        {
            var productInfo = await _db.Products
                .AsNoTracking()
                .Where(p => p.ProductID == productId)
                .Select(p => new
                {
                    p.ProductID,
                    p.ProductCode,
                    p.ProductName,
                    Unit = p.ProductDetails
                        .OrderByDescending(d => d.Id)
                        .Select(d => d.Unit)
                        .FirstOrDefault()
                })
                .FirstOrDefaultAsync();

            if (productInfo == null) return null;

            var inboundQuery =
                from item in _db.ReceivingSlipItems.AsNoTracking()
                join slip in _db.ReceivingSlips.AsNoTracking()
                    on item.ReceivingSlipId equals slip.Id
                where item.ProductId == productId
                      && !slip.IsDeleted
                      && slip.Status == ReceivingSlipStatus.Confirmed
                select new ProductTraceMovementDto
                {
                    Direction = "in",
                    SlipType = "receiving",
                    RefNo = slip.ReferenceNo,
                    Partner = slip.Supplier,
                    Date = slip.ReceiptDate,
                    Quantity = item.Quantity,
                    Uom = item.Uom,
                    Note = slip.Note,
                    SlipId = slip.Id
                };

            var salesOutboundQuery =
                from item in _db.DispatchItems.AsNoTracking()
                join d in _db.Set<RetailDispatch>().AsNoTracking()
                    on item.DispatchId equals d.Id
                where item.ProductId == productId
                      && !d.IsDeleted
                      && d.Status == DispatchStatus.Confirmed
                select new ProductTraceMovementDto
                {
                    Direction = "out",
                    SlipType = "sales",
                    RefNo = d.ReferenceNo,
                    Partner = d.CustomerName,
                    Date = d.DispatchDate,
                    Quantity = item.Quantity,
                    Uom = item.Uom,
                    Note = d.Note,
                    SlipId = d.Id
                };

            var projectOutboundQuery =
                from item in _db.DispatchItems.AsNoTracking()
                join d in _db.Set<ProjectDispatch>().AsNoTracking()
                    on item.DispatchId equals d.Id
                where item.ProductId == productId
                      && !d.IsDeleted
                      && d.Status == DispatchStatus.Confirmed
                select new ProductTraceMovementDto
                {
                    Direction = "out",
                    SlipType = "project",
                    RefNo = d.ReferenceNo,
                    Partner = d.ProjectName,
                    Date = d.DispatchDate,
                    Quantity = item.Quantity,
                    Uom = item.Uom,
                    Note = d.Note,
                    SlipId = d.Id
                };

            var movements = await inboundQuery
                .Concat(salesOutboundQuery)
                .Concat(projectOutboundQuery)
                .OrderBy(m => m.Date)
                .ToListAsync();

            return new ProductTraceDto
            {
                ProductId = productInfo.ProductID,
                ProductCode = productInfo.ProductCode,
                ProductName = productInfo.ProductName,
                Unit = productInfo.Unit,
                Movements = movements
            };
        }
    }
}
