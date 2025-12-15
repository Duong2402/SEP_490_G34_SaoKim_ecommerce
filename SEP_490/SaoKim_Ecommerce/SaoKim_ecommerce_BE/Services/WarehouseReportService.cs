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
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(q.Destination))
            {
                var dest = q.Destination.Trim();
                query = query.Where(d => d.Note != null && d.Note.Contains(dest));
            }

            if (q.FromDate.HasValue)
            {
                var fromLocal = q.FromDate.Value.Date;
                var fromUtc = DateTime
                    .SpecifyKind(fromLocal, DateTimeKind.Local)
                    .ToUniversalTime();

                query = query.Where(d => d.DispatchDate >= fromUtc);
            }

            if (q.ToDate.HasValue)
            {
                var toLocalExclusive = q.ToDate.Value.Date.AddDays(1);
                var toUtcExclusive = DateTime
                    .SpecifyKind(toLocalExclusive, DateTimeKind.Local)
                    .ToUniversalTime();

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
            var total = await _db.ProductDetails.SumAsync(d => d.Quantity);

            return new TotalStockDto
            {
                TotalStock = total
            };
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

            var baseQuery =
                from p in productQuery
                join d in _db.ProductDetails.AsNoTracking()
                    on p.ProductID equals d.ProductID into dg
                from d in dg.DefaultIfEmpty()
                join th in _db.InventoryThresholds.AsNoTracking()
                    on p.ProductID equals th.ProductId into thg
                from th in thg.DefaultIfEmpty()
                select new
                {
                    p.ProductID,
                    p.ProductCode,
                    p.ProductName,
                    Quantity = d != null ? d.Quantity : 0,
                    Unit = d != null ? d.Unit : null,
                    MinStock = (int?)th.MinStock ?? 0,
                    DetailStatus = d != null ? d.Status : null
                };

            baseQuery = baseQuery.Where(x => x.DetailStatus == null || x.DetailStatus == "Active");

            if (!string.IsNullOrWhiteSpace(q.Status) && q.Status != "all")
            {
                switch (q.Status)
                {
                    case "critical":
                        baseQuery = baseQuery.Where(x =>
                            x.Quantity <= 0 || (x.MinStock > 0 && x.Quantity <= 0));
                        break;

                    case "alert":
                        baseQuery = baseQuery.Where(x =>
                            x.MinStock > 0 && x.Quantity > 0 && x.Quantity < x.MinStock);
                        break;

                    case "stock":
                        baseQuery = baseQuery.Where(x =>
                            x.MinStock == 0 || x.Quantity >= x.MinStock);
                        break;
                }
            }

            var total = await baseQuery.CountAsync();

            var pageItems = await baseQuery
                .OrderBy(x => x.ProductName)
                .ThenBy(x => x.ProductCode)
                .Skip((q.Page - 1) * q.PageSize)
                .Take(q.PageSize)
                .Select(x => new InventoryListItemDto
                {
                    ProductId = x.ProductID,
                    ProductCode = x.ProductCode,
                    ProductName = x.ProductName,
                    OnHand = x.Quantity,
                    UomName = x.Unit,
                    MinStock = x.MinStock,
                    Status = null,
                    Note = null
                })
                .ToListAsync();

            return new PagedResult<InventoryListItemDto>
            {
                Page = q.Page,
                PageSize = q.PageSize,
                TotalItems = total,
                Items = pageItems
            };
        }
        public async Task<PagedResult<InventoryReportItemDto>> GetInventoryReportAsync(InventoryListQuery q)
        {
            if (q.Page <= 0) q.Page = 1;
            if (q.PageSize <= 0 || q.PageSize > 200) q.PageSize = 10;

            var fromDate = q.DateFrom?.Date;         
            var toDate = q.DateTo?.Date;             

            var from = fromDate ?? DateTime.MinValue;
            var toExclusive = (toDate?.AddDays(1)) ?? DateTime.MaxValue;

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
                select new
                {
                    p.ProductID,
                    p.ProductCode,
                    p.ProductName,
                    Quantity = d != null ? d.Quantity : 0,
                    Unit = d != null ? d.Unit : null,
                    MinStock = (int?)th.MinStock ?? 0,
                    DetailStatus = d != null ? d.Status : null
                };

            baseQuery = baseQuery.Where(x => x.DetailStatus == null || x.DetailStatus == "Active");

            var queryWithStatus = baseQuery.Select(x => new
            {
                x.ProductID,
                x.ProductCode,
                x.ProductName,
                x.Quantity,
                x.Unit,
                x.MinStock,
                Status =
                    x.MinStock <= 0
                        ? "stock"
                    : x.Quantity <= 0
                        ? "critical"
                    : x.Quantity < x.MinStock
                        ? "alert"
                        : "stock"
            });

            if (!string.IsNullOrWhiteSpace(q.Status) && q.Status != "all")
            {
                switch (q.Status)
                {
                    case "critical":
                        queryWithStatus = queryWithStatus.Where(x => x.Status == "critical");
                        break;
                    case "alert":
                        queryWithStatus = queryWithStatus.Where(x => x.Status == "alert");
                        break;
                    case "stock":
                        queryWithStatus = queryWithStatus.Where(x => x.Status == "stock");
                        break;
                }
            }

            var total = await queryWithStatus.CountAsync();

            var pageData = await queryWithStatus
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

            var inboundBase =
                from item in _db.ReceivingSlipItems.AsNoTracking()
                join slip in _db.ReceivingSlips.AsNoTracking()
                    on item.ReceivingSlipId equals slip.Id
                where item.ProductId != null
                      && productIds.Contains(item.ProductId.Value)
                      && slip.Status == ReceivingSlipStatus.Confirmed
                select new
                {
                    ProductId = item.ProductId!.Value,
                    slip.ReceiptDate,
                    item.Quantity
                };

            var inboundBeforeList = await inboundBase
                .Where(x => x.ReceiptDate < from)
                .GroupBy(x => x.ProductId)
                .Select(g => new { ProductId = g.Key, Qty = g.Sum(i => i.Quantity) })
                .ToListAsync();

            var inboundPeriodList = await inboundBase
                .Where(x => x.ReceiptDate >= from && x.ReceiptDate < toExclusive)
                .GroupBy(x => x.ProductId)
                .Select(g => new { ProductId = g.Key, Qty = g.Sum(i => i.Quantity) })
                .ToListAsync();

            var inboundBeforeDict = inboundBeforeList.ToDictionary(x => x.ProductId, x => x.Qty);
            var inboundPeriodDict = inboundPeriodList.ToDictionary(x => x.ProductId, x => x.Qty);

            var outboundBase =
                from item in _db.DispatchItems.AsNoTracking()
                join slip in _db.Dispatches.AsNoTracking()
                    on item.DispatchId equals slip.Id
                where item.ProductId != null
                      && productIds.Contains(item.ProductId.Value)
                      && slip.Status == DispatchStatus.Confirmed
                select new
                {
                    ProductId = item.ProductId!.Value,
                    slip.DispatchDate,
                    item.Quantity
                };

            var outboundBeforeList = await outboundBase
                .Where(x => x.DispatchDate < from)
                .GroupBy(x => x.ProductId)
                .Select(g => new { ProductId = g.Key, Qty = g.Sum(i => i.Quantity) })
                .ToListAsync();

            var outboundPeriodList = await outboundBase
                .Where(x => x.DispatchDate >= from && x.DispatchDate < toExclusive)
                .GroupBy(x => x.ProductId)
                .Select(g => new { ProductId = g.Key, Qty = g.Sum(i => i.Quantity) })
                .ToListAsync();

            var outboundBeforeDict = outboundBeforeList.ToDictionary(x => x.ProductId, x => x.Qty);
            var outboundPeriodDict = outboundPeriodList.ToDictionary(x => x.ProductId, x => x.Qty);

            var items = pageData
                .Select(x =>
                {
                    var productId = x.ProductID;

                    var inBefore = inboundBeforeDict.TryGetValue(productId, out var ib) ? ib : 0;
                    var outBefore = outboundBeforeDict.TryGetValue(productId, out var ob) ? ob : 0;

                    var inboundPeriod = inboundPeriodDict.TryGetValue(productId, out var ip) ? ip : 0;
                    var outboundPeriod = outboundPeriodDict.TryGetValue(productId, out var op) ? op : 0;

                    var opening = inBefore - outBefore;

                    var closing = opening + inboundPeriod - outboundPeriod;

                    return new InventoryReportItemDto
                    {
                        ProductId = x.ProductID,
                        ProductCode = x.ProductCode,
                        ProductName = x.ProductName,
                        OnHand = x.Quantity,         
                        UomName = x.Unit,
                        MinStock = x.MinStock,
                        Status = x.Status,
                        Note = null,
                        OpeningQty = opening,
                        InboundQty = inboundPeriod,
                        OutboundQty = outboundPeriod,
                        ClosingQty = closing
                    };
                })
                .ToList();

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
                throw new ArgumentException("MinStock must be >= 0");

            var productExists = await _db.Products.AnyAsync(p => p.ProductID == productId);
            if (!productExists)
                throw new KeyNotFoundException("Product not found");

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

            if (productInfo == null)
                return null;

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
