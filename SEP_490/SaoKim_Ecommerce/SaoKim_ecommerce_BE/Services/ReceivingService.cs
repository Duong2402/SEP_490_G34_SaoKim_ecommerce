using ClosedXML.Excel;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Helpers;
using SaoKim_ecommerce_BE.Hubs;

namespace SaoKim_ecommerce_BE.Services
{
    public class ReceivingService : IReceivingService
    {
        private readonly SaoKimDBContext _db;
        private readonly IHubContext<ReceivingHub> _receivingHub;

        public ReceivingService(SaoKimDBContext db,
            IHubContext<ReceivingHub> receivingHub)
        {
            _db = db;
            _receivingHub = receivingHub;
        }

        private async Task<Product> EnsureProductAndDetailAsync(
           ReceivingSlipItemDto dto,
           string uomName,
           string actor = "warehouse-manager")
        {
            Product product;
            ProductDetail detail;

            if (dto.ProductId.HasValue && dto.ProductId.Value != 0)
            {
                product = await _db.Products
                    .Include(p => p.ProductDetails)
                    .FirstOrDefaultAsync(p => p.ProductID == dto.ProductId.Value);

                if (product == null)
                {
                    product = new Product
                    {
                        ProductName = dto.ProductName.Trim(),
                        ProductCode = string.Empty
                    };
                    _db.Products.Add(product);
                    await _db.SaveChangesAsync();

                    product.ProductCode = ProductCodeGenerator.Generate(product.ProductName, product.ProductID);
                    _db.Products.Update(product);
                    await _db.SaveChangesAsync();

                    detail = new ProductDetail
                    {
                        ProductID = product.ProductID,
                        Unit = uomName,
                        Price = dto.UnitPrice,
                        Status = "Active",
                        Quantity = 0,
                        CreateAt = DateTime.UtcNow,
                        CreateBy = actor
                    };
                    _db.ProductDetails.Add(detail);
                    await _db.SaveChangesAsync();
                }
                else
                {
                    product.ProductName = dto.ProductName.Trim();
                    product.ProductCode = ProductCodeGenerator.Generate(product.ProductName, product.ProductID);
                    _db.Products.Update(product);

                    detail = product.ProductDetails
                        .OrderByDescending(d => d.Id)
                        .FirstOrDefault() ?? new ProductDetail { ProductID = product.ProductID };

                    if (detail.Id == 0)
                        _db.ProductDetails.Add(detail);

                    detail.Unit = uomName;
                    detail.Price = dto.UnitPrice;
                    detail.Status = "Active";
                    detail.UpdateAt = DateTime.UtcNow;
                    detail.UpdateBy = actor;

                    await _db.SaveChangesAsync();
                }
            }
            else
            {
                product = new Product
                {
                    ProductName = dto.ProductName.Trim(),
                    ProductCode = string.Empty
                };
                _db.Products.Add(product);
                await _db.SaveChangesAsync();

                product.ProductCode = ProductCodeGenerator.Generate(product.ProductName, product.ProductID);
                _db.Products.Update(product);
                await _db.SaveChangesAsync();

                detail = new ProductDetail
                {
                    ProductID = product.ProductID,
                    Unit = uomName,
                    Price = dto.UnitPrice,
                    Status = "Active",
                    Quantity = 0,
                    CreateAt = DateTime.UtcNow,
                    CreateBy = actor
                };
                _db.ProductDetails.Add(detail);
                await _db.SaveChangesAsync();
            }

            return product;
        }

        public async Task<PagedResult<ReceivingSlipListItemDto>> GetReceivingSlipListAsync(ReceivingSlipListQuery q)
        {
            if (q.Page <= 0) q.Page = 1;
            if (q.PageSize <= 0 || q.PageSize > 200) q.PageSize = 10;

            var query = _db.ReceivingSlips
                .Where(x => !x.IsDeleted)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(q.Search))
            {
                var s = q.Search.Trim().ToLower();
                query = query.Where(x =>
                    x.Supplier.ToLower().Contains(s) ||
                    x.ReferenceNo.ToLower().Contains(s));
            }

            if (q.DateFrom.HasValue)
                query = query.Where(x => x.ReceiptDate >= q.DateFrom.Value);

            if (q.DateTo.HasValue)
                query = query.Where(x => x.ReceiptDate <= q.DateTo.Value);

            if (q.Status.HasValue)
                query = query.Where(x => x.Status == q.Status.Value);

            var total = await query.CountAsync();

            var desc = string.Equals(q.SortOrder, "desc", StringComparison.OrdinalIgnoreCase);
            IQueryable<ReceivingSlip> ordered;

            if (!string.IsNullOrWhiteSpace(q.SortBy))
            {
                switch (q.SortBy)
                {
                    case "referenceNo":
                        ordered = desc
                            ? query.OrderByDescending(x => x.ReferenceNo).ThenByDescending(x => x.Id)
                            : query.OrderBy(x => x.ReferenceNo).ThenBy(x => x.Id);
                        break;

                    case "supplier":
                        ordered = desc
                            ? query.OrderByDescending(x => x.Supplier).ThenByDescending(x => x.Id)
                            : query.OrderBy(x => x.Supplier).ThenBy(x => x.Id);
                        break;

                    case "receiptDate":
                        ordered = desc
                            ? query.OrderByDescending(x => x.ReceiptDate).ThenByDescending(x => x.Id)
                            : query.OrderBy(x => x.ReceiptDate).ThenBy(x => x.Id);
                        break;

                    case "status":
                        ordered = desc
                            ? query.OrderByDescending(x => x.Status).ThenByDescending(x => x.Id)
                            : query.OrderBy(x => x.Status).ThenBy(x => x.Id);
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

                    default:
                        ordered = desc
                            ? query.OrderByDescending(x => x.ReceiptDate).ThenByDescending(x => x.Id)
                            : query.OrderBy(x => x.ReceiptDate).ThenBy(x => x.Id);
                        break;
                }
            }
            else
            {
                ordered = query.OrderByDescending(x => x.ReceiptDate).ThenByDescending(x => x.Id);
            }

            var items = await ordered
                .Skip((q.Page - 1) * q.PageSize)
                .Take(q.PageSize)
                .Select(x => new ReceivingSlipListItemDto
                {
                    Id = x.Id,
                    ReferenceNo = x.ReferenceNo,
                    Supplier = x.Supplier,
                    ReceiptDate = x.ReceiptDate,
                    Status = x.Status,
                    CreatedAt = x.CreatedAt,
                    ConfirmedAt = x.ConfirmedAt
                })
                .ToListAsync();

            return new PagedResult<ReceivingSlipListItemDto>
            {
                TotalItems = total,
                Page = q.Page,
                PageSize = q.PageSize,
                Items = items
            };
        }

        public async Task<ReceivingSlip> CreateReceivingSlipAsync(ReceivingSlipCreateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Supplier))
                throw new ArgumentException("Vui lòng điền nhà cung cấp");

            if (dto.Items == null || dto.Items.Count == 0)
                throw new ArgumentException("Phải có ít nhất 1 sản phẩm!");

            var slip = new ReceivingSlip
            {
                Supplier = dto.Supplier.Trim(),
                ReceiptDate = dto.ReceiptDate,
                Note = dto.Note?.Trim(),
                Status = ReceivingSlipStatus.Draft,
                Items = new List<ReceivingSlipItem>()
            };

            foreach (var i in dto.Items)
            {
                var uom = await _db.UnitOfMeasures
                    .FirstOrDefaultAsync(u => u.Name == i.Uom && u.Status == "Active");

                if (uom == null)
                    throw new ArgumentException($"Đơn vị tính '{i.Uom}' không tìm thấy");

                if (!i.ProductId.HasValue || i.ProductId.Value <= 0)
                    throw new ArgumentException("Vui lòng chọn sản phẩm");

                var product = await _db.Products
                    .FirstOrDefaultAsync(p => p.ProductID == i.ProductId.Value);

                if (product == null)
                    throw new ArgumentException($"Sản phẩm với ID {i.ProductId.Value} không tìm thấy");

                slip.Items.Add(new ReceivingSlipItem
                {
                    ProductId = i.ProductId.Value,
                    ProductName = product.ProductName,
                    ProductCode = product.ProductCode,
                    Uom = uom.Name,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    Total = i.Quantity * i.UnitPrice
                });
            }

            _db.ReceivingSlips.Add(slip);
            await _db.SaveChangesAsync();

            slip.ReferenceNo = $"RCV-{slip.Id:D3}";
            await _db.SaveChangesAsync();

            await _receivingHub.Clients.All.SendAsync("ReceivingSlipsUpdated", new
            {
                action = "created",
                slip.Id,
                slip.ReferenceNo,
                slip.Supplier,
                slip.ReceiptDate,
                slip.Status,
                slip.CreatedAt,
                slip.ConfirmedAt
            });

            return slip;
        }
        public async Task DeleteReceivingSlipAsync(int id)
        {
            var slip = await _db.ReceivingSlips
                .FirstOrDefaultAsync(x => x.Id == id);

            if (slip == null)
                throw new KeyNotFoundException("Phiếu nhập không tìm thấy");

            if (slip.Status != ReceivingSlipStatus.Draft)
                throw new InvalidOperationException("Chỉ bản nháp mới được xóa");

            slip.IsDeleted = true;

            await _db.SaveChangesAsync();
        }

        public async Task<ReceivingSlipItem> UpdateReceivingSlipItemAsync(int itemId, ReceivingSlipItemDto dto)
        {
            var item = await _db.ReceivingSlipItems
                .Include(i => i.ReceivingSlip)
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item is null)
                throw new KeyNotFoundException("Sản phẩm không tìm thấy");

            if (item.ReceivingSlip.Status != ReceivingSlipStatus.Draft)
                throw new InvalidOperationException("Chỉ có trạng thái đơn chưa xác nhận là được chỉnh sửa");

            if (string.IsNullOrWhiteSpace(dto.ProductName))
                throw new ArgumentException("Tên sản phẩm là bắt buộc");
            if (dto.Quantity <= 0)
                throw new ArgumentException("Số lượng phải lớn hơn 0");
            if (dto.UnitPrice < 0)
                throw new ArgumentException("Giá trị sản phẩm phải lớn hơn 0");

            var uom = await _db.UnitOfMeasures
                .FirstOrDefaultAsync(u => u.Name == dto.Uom && u.Status == "Active");

            if (uom == null)
                throw new ArgumentException("Đơn vị tính không hợp lệ");

            var product = await EnsureProductAndDetailAsync(dto, uom.Name, "warehouse-manager");

            item.ProductId = product.ProductID;
            item.ProductName = product.ProductName;
            item.ProductCode = product.ProductCode;
            item.Uom = uom.Name;
            item.Quantity = dto.Quantity;
            item.UnitPrice = dto.UnitPrice;
            item.Total = dto.Quantity * dto.UnitPrice;

            await _db.SaveChangesAsync();

            await _receivingHub.Clients.All.SendAsync("ReceivingItemsUpdated", new
            {
                action = "updated",
                slipId = item.ReceivingSlipId,
                item = new
                {
                    item.Id,
                    item.ProductId,
                    item.ProductName,
                    item.ProductCode,
                    item.Uom,
                    item.Quantity,
                    item.UnitPrice,
                    item.Total
                }
            });

            return item;
        }

        public async Task<ReceivingSlipItem> CreateReceivingSlipItemAsync(int slipId, ReceivingSlipItemDto dto)
        {
            var slip = await _db.ReceivingSlips
                .FirstOrDefaultAsync(x => x.Id == slipId);

            if (slip is null)
                throw new KeyNotFoundException("Phiếu xuất không tồn tại");

            if (slip.Status != ReceivingSlipStatus.Draft)
                throw new InvalidOperationException("Chỉ có trạng thái đơn chưa xác nhận là được chỉnh sửa");

            if (string.IsNullOrWhiteSpace(dto.ProductName))
                throw new ArgumentException("Tên sản phẩm là bắt buộc");
            if (dto.Quantity <= 0)
                throw new ArgumentException("Số lượng phải lớn hơn 0");
            if (dto.UnitPrice < 0)
                throw new ArgumentException("Giá trị sản phẩm phải lớn hơn 0");

            var uom = await _db.UnitOfMeasures
                .FirstOrDefaultAsync(u => u.Name == dto.Uom && u.Status == "Active");

            if (uom == null)
                throw new ArgumentException("Đơn vị tính không tồn tại");

            var product = await EnsureProductAndDetailAsync(dto, uom.Name, "warehouse-manager");

            var newItem = new ReceivingSlipItem
            {
                ReceivingSlipId = slipId,
                ProductId = product.ProductID,
                ProductName = product.ProductName,
                ProductCode = product.ProductCode,
                Uom = uom.Name,
                Quantity = dto.Quantity,
                UnitPrice = dto.UnitPrice,
                Total = dto.Quantity * dto.UnitPrice
            };

            _db.ReceivingSlipItems.Add(newItem);
            await _db.SaveChangesAsync();

            await _receivingHub.Clients.All.SendAsync("ReceivingItemsUpdated", new
            {
                action = "created",
                slipId = slipId,
                item = new
                {
                    newItem.Id,
                    newItem.ProductId,
                    newItem.ProductName,
                    newItem.ProductCode,
                    newItem.Uom,
                    newItem.Quantity,
                    newItem.UnitPrice,
                    newItem.Total
                }
            });

            return newItem;
        }

        public async Task<(int SlipId, int ItemId)> DeleteReceivingSlipItemAsync(int itemId)
        {
            var item = await _db.ReceivingSlipItems
                .Include(i => i.ReceivingSlip)
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item is null)
                throw new KeyNotFoundException("Dòng sản phẩm không tồn tại");

            if (item.ReceivingSlip.Status != ReceivingSlipStatus.Draft)
                throw new InvalidOperationException("Chỉ phiếu ở trạng thái Nháp mới được chỉnh sửa");

            var slipId = item.ReceivingSlipId;
            var deletedItemId = item.Id;

            _db.ReceivingSlipItems.Remove(item);
            await _db.SaveChangesAsync();

            return (slipId, deletedItemId);
        }
        public async Task<int> ImportReceivingSlipsAsync(Stream excelStream, string actor = "warehouse-manager")
        {
            if (excelStream == null || excelStream.Length == 0)
                throw new ArgumentException("File Excel không hợp lệ.");

            excelStream.Position = 0;

            using var workbook = new XLWorkbook(excelStream);
            var worksheet = workbook.Worksheets.First();

            var rows = worksheet.RangeUsed().RowsUsed().Skip(1);

            var data = rows.Select(r => new
            {
                Supplier = r.Cell(1).GetString(),
                ReceiptDate = ExcelHelper.ParseExcelDate(r.Cell(2)),
                Note = r.Cell(3).GetString(),
                ProductName = r.Cell(4).GetString(),
                Uom = r.Cell(5).GetString(),
                Quantity = ExcelHelper.SafeInt(r.Cell(6).GetDouble()),
                UnitPrice = ExcelHelper.SafeDecimal(r.Cell(7).GetDouble())
            }).ToList();

            var grouped = data
                .GroupBy(x => new { x.Supplier, x.ReceiptDate })
                .ToList();

            foreach (var g in grouped)
            {
                var slip = new ReceivingSlip
                {
                    Supplier = g.Key.Supplier,
                    ReceiptDate = g.Key.ReceiptDate,
                    Note = g.First().Note,
                    Status = ReceivingSlipStatus.Draft,
                    Items = new List<ReceivingSlipItem>()
                };

                foreach (var i in g)
                {
                    var dto = new ReceivingSlipItemDto
                    {
                        ProductId = null,
                        ProductName = i.ProductName,
                        Uom = string.IsNullOrWhiteSpace(i.Uom) ? "unit" : i.Uom,
                        Quantity = i.Quantity,
                        UnitPrice = i.UnitPrice
                    };

                    var product = await EnsureProductAndDetailAsync(dto, dto.Uom, actor);

                    slip.Items.Add(new ReceivingSlipItem
                    {
                        ProductId = product.ProductID,
                        ProductName = product.ProductName,
                        ProductCode = product.ProductCode,
                        Uom = dto.Uom,
                        Quantity = dto.Quantity,
                        UnitPrice = dto.UnitPrice,
                        Total = dto.Quantity * dto.UnitPrice
                    });
                }

                _db.ReceivingSlips.Add(slip);
                await _db.SaveChangesAsync();

                slip.ReferenceNo = $"RCV-{slip.Id:D3}";
                _db.ReceivingSlips.Update(slip);
                await _db.SaveChangesAsync();
            }

            return grouped.Count;
        }

        public async Task<ReceivingSlipConfirmResultDto> ConfirmReceivingSlipAsync(int id)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();

            var slip = await _db.ReceivingSlips
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (slip is null)
                throw new KeyNotFoundException("Phiếu nhập không tồn tại.");

            if (slip.Status != ReceivingSlipStatus.Draft)
                throw new InvalidOperationException("Chỉ bản nháp mới được xác thực.");

            if (slip.Items == null || slip.Items.Count == 0)
                throw new ArgumentException("Phiếu nhập không có sản phẩm để xác nhận.");

            if (slip.Items.Any(i => i.ProductId == null))
                throw new ArgumentException("Tất cả sản phẩm phải có ProductId.");

            var qtyByProduct = slip.Items
                .GroupBy(i => i.ProductId!.Value)
                .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

            var productIds = qtyByProduct.Keys.ToList();

            var products = await _db.Products
                .Where(p => productIds.Contains(p.ProductID))
                .ToDictionaryAsync(p => p.ProductID);

            var missing = productIds.Where(pid => !products.ContainsKey(pid)).ToList();
            if (missing.Count > 0)
                throw new ArgumentException("Một vài ID sản phẩm không tìm thấy.");

            var details = await _db.ProductDetails
                .Where(d => productIds.Contains(d.ProductID))
                .ToListAsync();

            var now = DateTime.UtcNow;

            foreach (var kv in qtyByProduct)
            {
                var productId = kv.Key;
                var addedQty = kv.Value;

                var detail = details.FirstOrDefault(d => d.ProductID == productId);
                if (detail == null)
                {
                    detail = new ProductDetail
                    {
                        ProductID = productId,
                        Quantity = addedQty,
                        Status = "Active",
                        CreateAt = now,
                        CreateBy = "warehouse-manager"
                    };

                    _db.ProductDetails.Add(detail);
                    details.Add(detail);
                }
                else
                {
                    detail.Quantity += addedQty;
                    detail.UpdateAt = now;
                    detail.UpdateBy = "warehouse-manager";
                }
            }

            slip.Status = ReceivingSlipStatus.Confirmed;
            slip.ConfirmedAt = now;

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return new ReceivingSlipConfirmResultDto
            {
                Id = slip.Id,
                ReferenceNo = slip.ReferenceNo,
                Status = slip.Status,
                ConfirmedAt = slip.ConfirmedAt,

                Supplier = slip.Supplier,
                ReceiptDate = slip.ReceiptDate,
                CreatedAt = slip.CreatedAt,

                AffectedProducts = qtyByProduct
        .Select(kv => new ReceivingSlipConfirmProductDto
        {
            ProductId = kv.Key,
            AddedQty = kv.Value
        }).ToList()
            };

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
        public async Task<ReceivingSlip> UpdateSupplierAsync(int id, SupplierUpdateDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            if (string.IsNullOrWhiteSpace(dto.Supplier))
                throw new ArgumentException("Vui lòng điền nhà cung cấp", nameof(dto.Supplier));

            var slip = await _db.ReceivingSlips.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);
            if (slip == null)
                throw new KeyNotFoundException("Phiếu nhập không tìm thấy");

            if (slip.Status != ReceivingSlipStatus.Draft)
                throw new InvalidOperationException("Chỉ bản nháp mới được chỉnh sửa");

            slip.Supplier = dto.Supplier.Trim();
            await _db.SaveChangesAsync();

            return slip;
        }

        public async Task<byte[]> ExportSelectedReceivingSlipsAsync(ReceivingExportRequestDto req)
        {
            if (req.Ids == null || req.Ids.Count == 0)
                throw new ArgumentException("Chưa có phiếu nào được chọn.");

            var slips = await _db.ReceivingSlips
                .Include(s => s.Items)
                .Where(s => req.Ids.Contains(s.Id))
                .OrderByDescending(s => s.ReceiptDate)
                .ThenByDescending(s => s.Id)
                .ToListAsync();

            using var wb = new XLWorkbook();

            var ws1 = wb.Worksheets.Add("Slips");
            int r = 1;
            ws1.Cell(r, 1).Value = "Id";
            ws1.Cell(r, 2).Value = "ReferenceNo";
            ws1.Cell(r, 3).Value = "Supplier";
            ws1.Cell(r, 4).Value = "ReceiptDate";
            ws1.Cell(r, 5).Value = "Status";
            ws1.Cell(r, 6).Value = "Note";
            ws1.Cell(r, 7).Value = "TotalItems";
            ws1.Cell(r, 8).Value = "TotalAmount";
            ws1.Range(r, 1, r, 8).Style.Font.SetBold();
            r++;

            foreach (var s in slips)
            {
                var totalItems = s.Items?.Sum(i => i.Quantity) ?? 0;
                var totalAmount = s.Items?.Sum(i => i.Total) ?? 0m;

                ws1.Cell(r, 1).Value = s.Id;
                ws1.Cell(r, 2).Value = s.ReferenceNo;
                ws1.Cell(r, 3).Value = s.Supplier;
                ws1.Cell(r, 4).Value = s.ReceiptDate;
                ws1.Cell(r, 4).Style.DateFormat.Format = "yyyy-MM-dd";
                ws1.Cell(r, 5).Value = s.Status.ToString();
                ws1.Cell(r, 6).Value = s.Note;
                ws1.Cell(r, 7).Value = totalItems;
                ws1.Cell(r, 8).Value = totalAmount;
                ws1.Cell(r, 8).Style.NumberFormat.Format = "#,##0.00";
                r++;
            }
            ws1.Columns().AdjustToContents();

            if (req.IncludeItems)
            {
                var ws2 = wb.Worksheets.Add("Items");
                int r2 = 1;
                ws2.Cell(r2, 1).Value = "SlipId";
                ws2.Cell(r2, 2).Value = "ReferenceNo";
                ws2.Cell(r2, 3).Value = "Supplier";
                ws2.Cell(r2, 4).Value = "ReceiptDate";
                ws2.Cell(r2, 5).Value = "ProductId";
                ws2.Cell(r2, 6).Value = "ProductCode";
                ws2.Cell(r2, 7).Value = "ProductName";
                ws2.Cell(r2, 8).Value = "Uom";
                ws2.Cell(r2, 9).Value = "Quantity";
                ws2.Cell(r2, 10).Value = "UnitPrice";
                ws2.Cell(r2, 11).Value = "Total";
                ws2.Range(r2, 1, r2, 11).Style.Font.SetBold();
                r2++;

                foreach (var s in slips)
                {
                    foreach (var it in s.Items ?? new List<ReceivingSlipItem>())
                    {
                        ws2.Cell(r2, 1).Value = s.Id;
                        ws2.Cell(r2, 2).Value = s.ReferenceNo;
                        ws2.Cell(r2, 3).Value = s.Supplier;
                        ws2.Cell(r2, 4).Value = s.ReceiptDate;
                        ws2.Cell(r2, 4).Style.DateFormat.Format = "yyyy-MM-dd";
                        ws2.Cell(r2, 5).Value = it.ProductId;
                        ws2.Cell(r2, 6).Value = it.ProductCode;
                        ws2.Cell(r2, 7).Value = it.ProductName;
                        ws2.Cell(r2, 8).Value = it.Uom;
                        ws2.Cell(r2, 9).Value = it.Quantity;
                        ws2.Cell(r2, 10).Value = it.UnitPrice;
                        ws2.Cell(r2, 10).Style.NumberFormat.Format = "#,##0.00";
                        ws2.Cell(r2, 11).Value = it.Total;
                        ws2.Cell(r2, 11).Style.NumberFormat.Format = "#,##0.00";
                        r2++;
                    }
                }

                ws2.Columns().AdjustToContents();
            }

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return ms.ToArray();
        }
    }
}
