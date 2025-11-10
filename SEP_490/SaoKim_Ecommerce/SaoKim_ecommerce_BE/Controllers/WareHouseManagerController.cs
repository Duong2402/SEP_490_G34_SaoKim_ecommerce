using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.DTOs.WarehouseManagerDTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Helpers;
using SaoKim_ecommerce_BE.Services;


namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/warehousemanager")]
    //[Authorize(Roles = "warehouse_manager")]
    public class WarehouseManagerController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        public WarehouseManagerController(SaoKimDBContext db) => _db = db;

        // GET /api/warehousemanager/receiving-slips
        [HttpGet("receiving-slips")]
        public async Task<IActionResult> GetReceivingSlipList([FromQuery] ReceivingSlipListQuery q)
        {
            if (q.Page <= 0) q.Page = 1;
            if (q.PageSize <= 0 || q.PageSize > 200) q.PageSize = 20;

            var query = _db.ReceivingSlips.AsQueryable();

            if (!string.IsNullOrWhiteSpace(q.Search))
            {
                var s = q.Search.Trim().ToLower();
                query = query.Where(x =>
                    x.Supplier.ToLower().Contains(s) ||
                    x.ReferenceNo.ToLower().Contains(s));
            }

            if (q.DateFrom.HasValue) query = query.Where(x => x.ReceiptDate >= q.DateFrom.Value);
            if (q.DateTo.HasValue) query = query.Where(x => x.ReceiptDate <= q.DateTo.Value);
            if (q.Status.HasValue) query = query.Where(x => x.Status == q.Status.Value);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.ReceiptDate).ThenByDescending(x => x.Id)
                .Select(x => new
                {
                    x.Id,
                    x.ReferenceNo,
                    x.Supplier,
                    x.ReceiptDate,
                    x.Status,
                    x.CreatedAt,
                    x.ConfirmedAt
                })
                .Skip((q.Page - 1) * q.PageSize)
                .Take(q.PageSize)
                .ToListAsync();

            return Ok(new { total, page = q.Page, pageSize = q.PageSize, items });
        }

        // POST /api/warehousemanager/receiving-slips
        [HttpPost("receiving-slips")]

        public async Task<IActionResult> CreateReceivingSlip([FromBody] ReceivingSlipCreateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Supplier))
                return BadRequest(new { message = "Supplier is required" });
            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new { message = "At least one item is required" });

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
                    return BadRequest(new { message = "UOM not found" });

                int? productId = i.ProductId;

                if (productId == null || productId == 0)
                {
                    var newProduct = new Product
                    {
                        ProductName = i.ProductName.Trim(),
                        Unit = uom.Name,
                        Price = i.UnitPrice,
                        Status = "Active"
                    };
                    _db.Products.Add(newProduct);
                    await _db.SaveChangesAsync();
                    productId = newProduct.ProductID;
                }

                slip.Items.Add(new ReceivingSlipItem
                {
                    ProductId = productId.Value,
                    ProductName = i.ProductName.Trim(),
                    ProductCode = productId.HasValue
                        ? (await _db.Products.Where(p => p.ProductID == productId.Value)
                            .Select(p => p.ProductCode).FirstOrDefaultAsync())
                        : null,
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

            return CreatedAtAction(nameof(GetReceivingSlipItems),
                new { id = slip.Id },
                new { slip.Id, slip.ReferenceNo });
        }

        [HttpGet("receiving-slips/{id:int}/items")]
        public async Task<IActionResult> GetReceivingSlipItems([FromRoute] int id)
        {
            var slip = await _db.ReceivingSlips
        .Include(s => s.Items)
        .FirstOrDefaultAsync(s => s.Id == id);

            if (slip == null)
                return NotFound(new { message = "Receiving slip not found" });

            var items = await _db.ReceivingSlipItems
                .Where(i => i.ReceivingSlipId == id)
                .OrderBy(i => i.Id)
                .Select(i => new
                {
                    i.Id,
                    i.ProductId,
                    i.ProductName,
                    i.ProductCode,
                    i.Uom,
                    i.Quantity,
                    i.UnitPrice,
                    i.Total
                })
                .ToListAsync();

            return Ok(new
            {
                status = slip.Status,
                supplier = slip.Supplier,
                items
            });
        }

        [HttpPut("receiving-items/{itemId:int}")]
        public async Task<IActionResult> UpdateReceivingSlipItem([FromRoute] int itemId, [FromBody] ReceivingSlipItemDto dto)
        {
            var item = await _db.ReceivingSlipItems
                .Include(i => i.ReceivingSlip)
                .Include(i => i.Product)
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item is null) return NotFound(new { message = "Item not found" });

            if (item.ReceivingSlip.Status != ReceivingSlipStatus.Draft)
                return Conflict(new { message = "Only Draft slips can be modified" });

            if (string.IsNullOrWhiteSpace(dto.ProductName))
                return BadRequest(new { message = "ProductName is required" });
            if (dto.Quantity <= 0)
                return BadRequest(new { message = "Quantity must be > 0" });
            if (dto.UnitPrice < 0)
                return BadRequest(new { message = "UnitPrice cannot be negative" });

            var uom = await _db.UnitOfMeasures
                   .FirstOrDefaultAsync(u => u.Name == dto.Uom && u.Status == "Active");

            if (uom == null)
                return BadRequest(new { message = "Đơn vị tính không hợp lệ" });

            Product? product = null;

            if (dto.ProductId.HasValue && dto.ProductId.Value != 0)
            {
                product = await _db.Products.FirstOrDefaultAsync(p => p.ProductID == dto.ProductId.Value);
                if (product == null)
                {
                    product = new Product
                    {
                        ProductName = dto.ProductName.Trim(),
                        Unit = uom.Name,
                        Price = dto.UnitPrice,
                        Status = "Active"
                    };
                    _db.Products.Add(product);
                    await _db.SaveChangesAsync();

                    product.ProductCode = ProductCodeGenerator.Generate(product.ProductName, product.ProductID);
                    _db.Products.Update(product);
                    await _db.SaveChangesAsync();
                }
                else
                {
                    product.ProductName = dto.ProductName.Trim();
                    product.Unit = uom.Name;
                    product.Price = dto.UnitPrice;

                    product.ProductCode = ProductCodeGenerator.Generate(product.ProductName, product.ProductID);
                    _db.Products.Update(product);
                    await _db.SaveChangesAsync();
                }
            }
            else
            {
                product = new Product
                {
                    ProductName = dto.ProductName.Trim(),
                    Unit = uom.Name,
                    Price = dto.UnitPrice,
                    Status = "Active"
                };
                _db.Products.Add(product);
                await _db.SaveChangesAsync();

                product.ProductCode = ProductCodeGenerator.Generate(product.ProductName, product.ProductID);
                _db.Products.Update(product);
                await _db.SaveChangesAsync();
            }

            item.ProductId = product.ProductID;
            item.ProductName = product.ProductName;
            item.ProductCode = product.ProductCode;
            item.Uom = product.Unit;
            item.Quantity = dto.Quantity;
            item.UnitPrice = dto.UnitPrice;
            item.Total = dto.Quantity * dto.UnitPrice;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                item.Id,
                item.ProductId,
                item.ProductName,
                item.ProductCode,
                item.Uom,
                item.Quantity,
                item.UnitPrice,
                item.Total
            });
        }

        [HttpPost("receiving-slips/{id:int}/items")]
        public async Task<IActionResult> CreateReceivingSlipItem([FromRoute] int id, [FromBody] ReceivingSlipItemDto dto)
        {
            var slip = await _db.ReceivingSlips.FirstOrDefaultAsync(x => x.Id == id);
            if (slip is null)
                return NotFound(new { message = "Receiving slip not found" });

            if (slip.Status != ReceivingSlipStatus.Draft)
                return Conflict(new { message = "Only Draft slips can be modified" });

            if (string.IsNullOrWhiteSpace(dto.ProductName))
                return BadRequest(new { message = "ProductName is required" });
            if (dto.Quantity <= 0)
                return BadRequest(new { message = "Quantity must be > 0" });
            if (dto.UnitPrice < 0)
                return BadRequest(new { message = "UnitPrice cannot be negative" });

            var uom = await _db.UnitOfMeasures
                   .FirstOrDefaultAsync(u => u.Name == dto.Uom && u.Status == "Active");

            if (uom == null)
                return BadRequest(new { message = "UOM not found" });

            Product? product = null;

            if (dto.ProductId.HasValue)
            {
                product = await _db.Products.FirstOrDefaultAsync(p => p.ProductID == dto.ProductId.Value);
                if (product == null)
                {
                    product = new Product
                    {
                        ProductName = dto.ProductName.Trim(),
                        Unit = uom.Name,
                        Price = dto.UnitPrice,
                        Status = "Active"
                    };
                    _db.Products.Add(product);
                    await _db.SaveChangesAsync();

                    product.ProductCode = ProductCodeGenerator.Generate(product.ProductName, product.ProductID);
                    _db.Products.Update(product);
                    await _db.SaveChangesAsync();
                }
            }
            else
            {
                product = new Product
                {
                    ProductName = dto.ProductName.Trim(),
                    Unit = uom.Name,
                    Price = dto.UnitPrice,
                    Status = "Active"
                };
                _db.Products.Add(product);
                await _db.SaveChangesAsync();

                product.ProductCode = ProductCodeGenerator.Generate(product.ProductName, product.ProductID);
                _db.Products.Update(product);
                await _db.SaveChangesAsync();
            }

            var newItem = new ReceivingSlipItem
            {
                ReceivingSlipId = id,
                ProductId = product.ProductID,
                ProductName = product.ProductName,
                ProductCode = product.ProductCode,
                Uom = product.Unit,
                Quantity = dto.Quantity,
                UnitPrice = dto.UnitPrice,
                Total = dto.Quantity * dto.UnitPrice
            };

            _db.ReceivingSlipItems.Add(newItem);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                newItem.Id,
                newItem.ProductId,
                newItem.ProductName,
                newItem.ProductCode,
                newItem.Uom,
                newItem.Quantity,
                newItem.UnitPrice,
                newItem.Total
            });
        }


        [HttpDelete("receiving-items/{itemId:int}")]
        public async Task<IActionResult> DeleteReceivingSlipItem([FromRoute] int itemId)
        {
            var item = await _db.ReceivingSlipItems
                .Include(i => i.ReceivingSlip)
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item is null) return NotFound(new { message = "Item not found" });

            if (item.ReceivingSlip.Status != ReceivingSlipStatus.Draft)
                return Conflict(new { message = "Only Draft slips can be modified" });

            _db.ReceivingSlipItems.Remove(item);
            await _db.SaveChangesAsync();

            return NoContent();
        }

        // DELETE /api/warehousemanager/receiving-slips/{id}
        [HttpDelete("receiving-slips/{id:int}")]
        public async Task<IActionResult> DeleteReceivingSlip([FromRoute] int id)
        {
            var slip = await _db.ReceivingSlips.FindAsync(id);
            if (slip == null) return NotFound();
            if (slip.Status != ReceivingSlipStatus.Draft)
                return Conflict(new { message = "Only Draft slips can be deleted" });
            slip.IsDeleted = true;
            await _db.SaveChangesAsync();
            return Ok(new { message = "Phiếu đã được đưa vào thùng rác." });
        }

        [HttpPost("receiving-slips/import")]
        public async Task<IActionResult> ImportReceivingSlips(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Vui lòng chọn file Excel hợp lệ." });

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);

            using var workbook = new ClosedXML.Excel.XLWorkbook(stream);
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
                    var product = await _db.Products.FirstOrDefaultAsync(p => p.ProductName == i.ProductName);
                    if (product == null)
                    {
                        product = new Product
                        {
                            ProductName = i.ProductName,
                            Unit = string.IsNullOrWhiteSpace(i.Uom) ? "unit" : i.Uom,
                            Price = i.UnitPrice,
                            Status = "Active"
                        };
                        _db.Products.Add(product);
                        await _db.SaveChangesAsync();

                        product.ProductCode = ProductCodeGenerator.Generate(product.ProductName, product.ProductID);
                        _db.Products.Update(product);
                        await _db.SaveChangesAsync();
                    }

                    slip.Items.Add(new ReceivingSlipItem
                    {
                        ProductId = product.ProductID,
                        ProductName = product.ProductName,
                        ProductCode = product.ProductCode,
                        Uom = product.Unit,
                        Quantity = i.Quantity,
                        UnitPrice = i.UnitPrice,
                        Total = i.Quantity * i.UnitPrice
                    });
                }

                _db.ReceivingSlips.Add(slip);
                await _db.SaveChangesAsync();

                slip.ReferenceNo = $"RCV-{slip.Id:D3}";
                _db.ReceivingSlips.Update(slip);
                await _db.SaveChangesAsync();
            }

            return Ok(new { message = $"Đã nhập {grouped.Count} phiếu thành công!" });
        }


        // POST /api/warehousemanager/receiving-slips/{id}/confirm
        [HttpPost("receiving-slips/{id:int}/confirm")]
        public async Task<IActionResult> ConfirmReceivingSlip([FromRoute] int id)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();

            var slip = await _db.ReceivingSlips
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (slip is null) return NotFound();
            if (slip.Status != ReceivingSlipStatus.Draft)
                return Conflict(new { message = "Only Draft slips can be confirmed" });
            if (slip.Items == null || slip.Items.Count == 0)
                return BadRequest(new { message = "Receiving slip has no items" });
            if (slip.Items.Any(i => i.ProductId == null))
                return BadRequest(new { message = "All items must have ProductId before confirming" });


            var qtyByProduct = slip.Items
                .GroupBy(i => i.ProductId!.Value)
                .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

            var productIds = qtyByProduct.Keys.ToList();
            var products = await _db.Products
                .Where(p => productIds.Contains(p.ProductID))
                .ToDictionaryAsync(p => p.ProductID);

            var missing = productIds.Where(pid => !products.ContainsKey(pid)).ToList();
            if (missing.Count > 0)
                return BadRequest(new { message = "Some ProductIds not found", missing });

            foreach (var kv in qtyByProduct)
            {
                products[kv.Key].Quantity += kv.Value;
            }

            slip.Status = ReceivingSlipStatus.Confirmed;
            slip.ConfirmedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new
            {
                slip.Id,
                slip.ReferenceNo,
                slip.Status,
                slip.ConfirmedAt,
                affectedProducts = qtyByProduct.Select(kv => new { ProductId = kv.Key, AddedQty = kv.Value })
            });
        }

        [HttpPost("dispatch-slips/{id:int}/confirm")]
        public async Task<IActionResult> ConfirmDispatchSlip([FromRoute] int id)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();

            var slip = await _db.Dispatches
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (slip == null) return NotFound();
            if (slip.Status != DispatchStatus.Draft)
                return Conflict(new { message = "Only Draft slips can be confirmed" });
            if (slip.Items == null || slip.Items.Count == 0)
                return BadRequest(new { message = "Dispatch slip has no items" });
            if (slip.Items.Any(i => i.ProductId == null))
                return BadRequest(new { message = "All items must have ProductId before confirming" });

            var qtyByProduct = slip.Items
                .GroupBy(i => i.ProductId)
                .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

            var productIds = qtyByProduct.Keys.ToList();
            var products = await _db.Products
                .Where(p => productIds.Contains(p.ProductID))
                .ToDictionaryAsync(p => p.ProductID);

            var missing = productIds.Where(pid => !products.ContainsKey(pid)).ToList();
            if (missing.Count > 0)
                return BadRequest(new { message = "Some ProductIds not found", missing });

            var insufficient = qtyByProduct
                .Where(kv => products[kv.Key].Quantity < kv.Value)
                .Select(kv => new { kv.Key, Required = kv.Value, Available = products[kv.Key].Quantity })
                .ToList();

            if (insufficient.Count > 0)
                return BadRequest(new { message = "Insufficient stock for some products", insufficient });

            foreach (var kv in qtyByProduct)
            {
                products[kv.Key].Quantity -= kv.Value;
            }

            slip.Status = DispatchStatus.Confirmed;
            slip.ConfirmedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new
            {
                slip.Id,
                slip.ReferenceNo,
                slip.Status,
                slip.ConfirmedAt,
                affectedProducts = qtyByProduct.Select(kv => new { ProductId = kv.Key, DeductedQty = kv.Value })
            });
        }


        // GET /api/warehousemanager/inbound-report
        [HttpGet("inbound-report")]
        public async Task<IActionResult> GetInboundReport([FromQuery] InboundReportQuery q)
        {
            var query = _db.ReceivingSlips
                .Include(s => s.Items)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(q.Supplier))
                query = query.Where(s => s.Supplier.Contains(q.Supplier));

            if (!string.IsNullOrWhiteSpace(q.Project))
                query = query.Where(s => s.Note != null && s.Note.Contains(q.Project));

            if (!string.IsNullOrWhiteSpace(q.Source))
                query = query.Where(s => s.Note != null && s.Note.Contains(q.Source));

            if (q.FromDate.HasValue)
                query = query.Where(s => s.ReceiptDate >= q.FromDate.Value);

            if (q.ToDate.HasValue)
                query = query.Where(s => s.ReceiptDate <= q.ToDate.Value);

            var report = await query
                .Select(s => new
                {
                    s.Supplier,
                    s.ReceiptDate,
                    TotalItems = s.Items.Count,
                    TotalQuantity = s.Items.Sum(i => i.Quantity),
                    TotalValue = s.Items.Sum(i => i.Total)
                })
                .OrderByDescending(x => x.ReceiptDate)
                .ToListAsync();

            return Ok(report);
        }

        [HttpGet("inbound-report/export")]
        public async Task<IActionResult> ExportInboundReport([FromQuery] InboundReportQuery q)
        {
            var report = await GetInboundReport(q) as OkObjectResult;
            var data = report?.Value as List<InboundReportDto>;

            return Ok(data);
        }

        [HttpGet("download-template")]
        public IActionResult DownloadTemplate()
        {
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "templates", "receiving_template.xlsx");

            if (!System.IO.File.Exists(filePath))
            {
                return NotFound(new { message = "Không tìm thấy file mẫu Excel." });
            }

            var fileBytes = System.IO.File.ReadAllBytes(filePath);
            var fileName = "receiving_template.xlsx";

            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName
            );
        }

        [HttpPatch("receiving-slips/{id:int}")]
        public async Task<IActionResult> UpdateSupplier([FromRoute] int id, [FromBody] SupplierUpdateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Supplier))
                return BadRequest(new { message = "Supplier cannot be empty" });

            var slip = await _db.ReceivingSlips.FindAsync(id);
            if (slip == null) return NotFound(new { message = "Receiving slip not found" });

            if (slip.Status != ReceivingSlipStatus.Draft)
                return Conflict(new { message = "Only Draft slips can be modified" });

            slip.Supplier = dto.Supplier.Trim();
            await _db.SaveChangesAsync();

            return Ok(new { slip.Id, slip.Supplier });
        }

        [HttpGet("dispatch-slips")]
        public async Task<IActionResult> GetDispatchSlips([FromQuery] string? type, [FromQuery] string? search)
        {
            if (!string.IsNullOrWhiteSpace(type) && type.Equals("Sales", StringComparison.OrdinalIgnoreCase))
            {
                var querySales = _db.Set<RetailDispatch>().AsQueryable();

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.Trim().ToLower();
                    querySales = querySales.Where(r =>
                        r.ReferenceNo.ToLower().Contains(s) ||
                        r.CustomerName.ToLower().Contains(s));
                }

                var items = await querySales
                    .OrderByDescending(x => x.DispatchDate)
                    .Select(x => new
                    {
                        x.Id,
                        Type = "Sales",
                        x.ReferenceNo,
                        x.CustomerName,
                        x.CustomerId,
                        DispatchDate = x.DispatchDate,
                        x.Status,
                        x.CreatedAt,
                        x.ConfirmedAt,
                        x.Note
                    })
                    .ToListAsync();

                return Ok(new { total = items.Count, items });
            }

            if (!string.IsNullOrWhiteSpace(type) && type.Equals("Project", StringComparison.OrdinalIgnoreCase))
            {
                var queryProject = _db.Set<ProjectDispatch>().AsQueryable();

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.Trim().ToLower();
                    queryProject = queryProject.Where(p =>
                        p.ReferenceNo.ToLower().Contains(s) ||
                        p.ProjectName.ToLower().Contains(s));
                }

                var items = await queryProject
                    .OrderByDescending(x => x.DispatchDate)
                    .Select(x => new
                    {
                        x.Id,
                        Type = "Project",
                        x.ReferenceNo,
                        x.ProjectName,
                        x.ProjectId,
                        DispatchDate = x.DispatchDate,
                        x.Status,
                        x.CreatedAt,
                        x.ConfirmedAt,
                        x.Note
                    })
                    .ToListAsync();

                return Ok(new { total = items.Count, items });
            }

            var sales = await _db.Set<RetailDispatch>().Select(x => new
            {
                x.Id,
                Type = "Sales",
                x.ReferenceNo,
                x.CustomerName,
                x.CustomerId,
                DispatchDate = x.DispatchDate,
                x.Status,
                x.CreatedAt,
                x.ConfirmedAt,
                x.Note
            }).ToListAsync();

            var projects = await _db.Set<ProjectDispatch>().Select(x => new
            {
                x.Id,
                Type = "Project",
                x.ReferenceNo,
                x.ProjectName,
                x.ProjectId,
                DispatchDate = x.DispatchDate,
                x.Status,
                x.CreatedAt,
                x.ConfirmedAt,
                x.Note
            }).ToListAsync();

            var itemsCombined = sales.Cast<object>().Concat(projects.Cast<object>()).ToList();

            return Ok(new { total = itemsCombined.Count, items = itemsCombined });
        }

        [HttpGet("receiving-slips/weekly-summary")]
        public async Task<IActionResult> GetWeeklyInboundSummary()
        {
            var today = DateTime.UtcNow.Date;
            var dayOfWeek = (int)today.DayOfWeek;
            var startOfThisWeek = today.AddDays(-dayOfWeek + 1);
            var startOfLastWeek = startOfThisWeek.AddDays(-7);

            var thisWeekTotal = await _db.ReceivingSlips
                .Where(s => s.Status == ReceivingSlipStatus.Confirmed && s.ReceiptDate >= startOfThisWeek)
                .CountAsync();

            var lastWeekTotal = await _db.ReceivingSlips
                .Where(s => s.Status == ReceivingSlipStatus.Confirmed && s.ReceiptDate >= startOfLastWeek && s.ReceiptDate < startOfThisWeek)
                .CountAsync();

            return Ok(new
            {
                thisWeek = thisWeekTotal,
                lastWeek = lastWeekTotal
            });
        }

        [HttpGet("dispatch-slips/weekly-summary")]
        public async Task<IActionResult> GetWeeklyOutboundSummary()
        {
            var today = DateTime.UtcNow.Date;
            var dayOfWeek = (int)today.DayOfWeek;
            var startOfThisWeek = today.AddDays(-dayOfWeek + 1);
            var startOfLastWeek = startOfThisWeek.AddDays(-7);

            var thisWeekTotal = await _db.Dispatches
                .Where(s => s.Status == DispatchStatus.Confirmed && s.DispatchDate >= startOfThisWeek)
                .CountAsync();

            var lastWeekTotal = await _db.Dispatches
                .Where(s => s.Status == DispatchStatus.Confirmed
                            && s.DispatchDate >= startOfLastWeek
                            && s.DispatchDate < startOfThisWeek)
                .CountAsync();

            return Ok(new
            {
                thisWeek = thisWeekTotal,
                lastWeek = lastWeekTotal
            });
        }

        [HttpGet("total-stock")]
        public async Task<IActionResult> GetTotalStock()
        {
            var totalStock = await _db.Products
                .SumAsync(p => p.Quantity);

            return Ok(new { totalStock });
        }

        [HttpGet("unit-of-measures")]
        public async Task<IActionResult> GetUnitOfMeasures()
        {
            var uoms = await _db.UnitOfMeasures
                                .Where(u => u.Status == "Active")
                                .OrderBy(u => u.Name)
                                .ToListAsync();
            return Ok(uoms.Select(u => new { id = u.Id, name = u.Name }));
        }

        // GET /api/warehousemanager/customers?search=abc
        [HttpGet("customers")]
        public async Task<IActionResult> GetCustomers([FromQuery] string? search)
        {
            var customerRoleId = await _db.Roles
                .Where(r => EF.Functions.ILike(r.Name, "customer"))
                .Select(r => r.RoleId)
                .FirstOrDefaultAsync();

            if (customerRoleId == 0)
                return Ok(Array.Empty<object>());

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
                .Select(u => new { id = u.UserID, name = u.Name })
                .ToListAsync();

            return Ok(items);
        }

        // GET /api/warehousemanager/projects?search=abc
        [HttpGet("projects")]
        public async Task<IActionResult> GetProjects([FromQuery] string? search)
        {
            var q = _db.Projects.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(p => p.Name.ToLower().Contains(s));
            }

            var items = await q
                .OrderBy(p => p.Name)
                .Select(p => new { id = p.Id, name = p.Name })
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost("dispatch-slips/sales")]
        public async Task<IActionResult> CreateSales([FromBody] RetailDispatchCreateDto dto)
        {
            if (!(dto.CustomerId is > 0))
                return BadRequest(new { message = "CustomerId is required > 0", received = dto.CustomerId });

            var customer = await _db.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserID == dto.CustomerId && u.Role!.Name == "Customer");
            if (customer == null)
                return NotFound(new { message = $"Customer {dto.CustomerId} not found or not a Customer role" });

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

            return CreatedAtAction(nameof(GetById), new { id = slip.Id }, new
            {
                slip.Id,
                slip.ReferenceNo,
                slip.Type,
                slip.Status,
                receivedCustomerId = dto.CustomerId
            });
        }

        [HttpPost("dispatch-slips/projects")]
        public async Task<IActionResult> CreateProject([FromBody] ProjectDispatchCreateDto dto)
        {
            if (!(dto.ProjectId is > 0))
                return BadRequest(new { message = "ProjectId is required > 0", received = dto.ProjectId });

            var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == dto.ProjectId);
            if (project == null)
                return NotFound(new { message = $"Project {dto.ProjectId} not found" });

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

            return CreatedAtAction(nameof(GetById), new { id = slip.Id }, new
            {
                slip.Id,
                slip.ReferenceNo,
                slip.Type,
                slip.Status,
                receivedProjectId = dto.ProjectId
            });
        }
        // GET /api/warehousemanager/dispatch-slips/{id}
        [HttpGet("dispatch-slips/{id:int}")]
        public async Task<IActionResult> GetById([FromRoute] int id)
        {
            var s = await _db.Set<RetailDispatch>().FirstOrDefaultAsync(x => x.Id == id)
                 as DispatchBase ?? await _db.Set<ProjectDispatch>().FirstOrDefaultAsync(x => x.Id == id);

            if (s == null) return NotFound();

            return Ok(new
            {
                s.Id,
                s.ReferenceNo,
                s.Type,
                s.Status,
                s.DispatchDate,
                s.Note,
                CustomerName = (s is RetailDispatch r) ? r.CustomerName : null,
                CustomerId = (s is RetailDispatch r2) ? r2.CustomerId : null,
                ProjectName = (s is ProjectDispatch p) ? p.ProjectName : null,
                ProjectId = (s is ProjectDispatch p2) ? p2.ProjectId : null
            });
        }

        [HttpGet("dispatch-slips/{id:int}/items")]
        public async Task<IActionResult> GetDispatchItems(int id)
        {
            var items = await _db.DispatchItems
                .Where(i => i.DispatchId == id)
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost("dispatch-slips/{id:int}/items")]
        public async Task<IActionResult> CreateDispatchItem(int id, [FromBody] DispatchItemDto dto)
        {
            var dispatch = await _db.Dispatches.FindAsync(id);
            if (dispatch == null) return NotFound($"Dispatch {id} không tồn tại");

            if (string.IsNullOrWhiteSpace(dto.ProductName))
                return BadRequest("Tên sản phẩm không được để trống");
            if (dto.Quantity <= 0)
                return BadRequest("Số lượng phải lớn hơn 0");
            if (dto.ProductId == null)
                return BadRequest("ProductId không được để trống");

            var item = new DispatchItem
            {
                DispatchId = id,
                ProductId = dto.ProductId.Value,
                ProductName = dto.ProductName,
                Uom = dto.Uom ?? "pcs",
                Quantity = dto.Quantity,
                UnitPrice = dto.UnitPrice,
                Total = dto.Quantity * dto.UnitPrice,
                Dispatch = null
            };

            _db.DispatchItems.Add(item);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                item.Id,
                item.DispatchId,
                item.ProductId,
                item.ProductName,
                item.Uom,
                item.Quantity,
                item.UnitPrice,
                item.Total
            });
        }

        // PUT: /api/warehousemanager/dispatch-items/{itemId}
        [HttpPut("dispatch-items/{itemId:int}")]
        public async Task<IActionResult> UpdateDispatchItem(int itemId, [FromBody] DispatchItemDto dto)
        {
            var item = await _db.DispatchItems.FindAsync(itemId);
            if (item == null) return NotFound($"Item {itemId} không tồn tại");

            item.ProductId = dto.ProductId ?? 0;
            item.ProductName = dto.ProductName;
            item.Uom = dto.Uom ?? "pcs";
            item.Quantity = dto.Quantity;
            item.UnitPrice = dto.UnitPrice;
            item.Total = dto.Quantity * dto.UnitPrice;

            await _db.SaveChangesAsync();
            return Ok(item);
        }

        // DELETE: /api/warehousemanager/dispatch-items/{itemId}
        [HttpDelete("dispatch-items/{itemId:int}")]
        public async Task<IActionResult> DeleteDispatchItem(int itemId)
        {
            var item = await _db.DispatchItems.FindAsync(itemId);
            if (item == null) return NotFound($"Item {itemId} không tồn tại");

            _db.DispatchItems.Remove(item);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("inventory")]
        public async Task<IActionResult> GetInventory([FromQuery] InventoryListQuery q)
        {
            if (q.Page <= 0) q.Page = 1;
            if (q.PageSize <= 0 || q.PageSize > 200) q.PageSize = 10;

            var query = _db.Products.AsNoTracking().Where(p => p.Status == "Active");

            if (!string.IsNullOrWhiteSpace(q.Search))
            {
                var s = q.Search.Trim().ToLower();
                query = query.Where(p =>
                    (p.ProductCode ?? "").ToLower().Contains(s) ||
                    p.ProductName.ToLower().Contains(s));
            }

            var baseQuery =
                from p in query
                join th in _db.InventoryThresholds.AsNoTracking()
                    on p.ProductID equals th.ProductId into thg
                from th in thg.DefaultIfEmpty()
                select new
                {
                    p.ProductID,
                    p.ProductCode,
                    p.ProductName,
                    p.Quantity,
                    p.Unit,
                    MinStock = (int?)th.MinStock ?? 0
                };

            if (!string.IsNullOrWhiteSpace(q.Status) && q.Status != "all")
            {
                switch (q.Status)
                {
                    case "critical":
                        baseQuery = baseQuery.Where(x => x.Quantity <= 0 || (x.MinStock > 0 && x.Quantity <= 0));
                        break;
                    case "alert":
                        baseQuery = baseQuery.Where(x => x.MinStock > 0 && x.Quantity > 0 && x.Quantity < x.MinStock);
                        break;
                    case "stock":
                        baseQuery = baseQuery.Where(x => x.MinStock == 0 || x.Quantity >= x.MinStock);
                        break;
                }
            }

            var total = await baseQuery.CountAsync();

            var items = await baseQuery
                .OrderBy(x => x.ProductName)
                .ThenBy(x => x.ProductCode)
                .Skip((q.Page - 1) * q.PageSize)
                .Take(q.PageSize)
                .Select(x => new
                {
                    productId = x.ProductID,
                    productCode = x.ProductCode,
                    productName = x.ProductName,
                    onHand = x.Quantity,
                    uomName = x.Unit,
                    minStock = x.MinStock,
                    status = (string?)null,
                    note = (string?)null
                })
                .ToListAsync();

            return Ok(new { total, items });
        }

        [HttpPatch("inventory/{productId:int}/min-stock")]
        public async Task<IActionResult> UpdateMinStock([FromRoute] int productId, [FromBody] UpdateMinStockDto dto)
        {
            if (dto.MinStock < 0)
                return BadRequest(new { message = "MinStock must be >= 0" });

            var productExists = await _db.Products.AnyAsync(p => p.ProductID == productId);
            if (!productExists)
                return NotFound(new { message = "Product not found" });

            var threshold = await _db.InventoryThresholds
                .FirstOrDefaultAsync(t => t.ProductId == productId);

            if (threshold == null)
            {
                threshold = new InventoryThreshold
                {
                    ProductId = productId,
                    MinStock = dto.MinStock,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.InventoryThresholds.Add(threshold);
            }
            else
            {
                threshold.MinStock = dto.MinStock;
                threshold.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            return Ok(new { productId, minStock = threshold.MinStock });
        }


        [HttpGet("trace")]
        public async Task<IActionResult> SearchTrace([FromQuery] TraceSearchQuery q)
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
                .Select(i => new
                {
                    id = i.Id,
                    serial = i.IdentityCode,
                    sku = i.Product != null ? i.Product.ProductCode : null,
                    productName = i.Product != null ? i.Product.ProductName : null,
                    status = i.Status,
                    project = i.ProjectName,
                    currentLocation = i.CurrentLocation,
                    timeline = i.Events
                        .OrderBy(e => e.OccurredAt)
                        .Select(e => new
                        {
                            time = e.OccurredAt,
                            type = e.EventType,
                            @ref = e.RefCode,
                            actor = e.Actor,
                            note = e.Note
                        })
                        .ToList()
                })
                .ToListAsync();

            return Ok(items);
        }

        // GET /api/warehousemanager/trace/{id}
        [HttpGet("trace/{id:int}")]
        public async Task<IActionResult> GetTraceById([FromRoute] int id)
        {
            var i = await _db.TraceIdentities
                .AsNoTracking()
                .Include(x => x.Product)
                .Include(x => x.Events)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (i == null) return NotFound();

            var payload = new
            {
                id = i.Id,
                serial = i.IdentityCode,
                sku = i.Product!.ProductCode,
                productName = i.Product!.ProductName,
                status = i.Status,
                project = i.ProjectName,
                currentLocation = i.CurrentLocation,
                timeline = i.Events
                    .OrderBy(e => e.OccurredAt)
                    .Select(e => new
                    {
                        time = e.OccurredAt,
                        type = e.EventType,
                        @ref = e.RefCode,
                        actor = e.Actor,
                        note = e.Note
                    })
                    .ToList()
            };

            return Ok(payload);
        }

        // POST /api/warehousemanager/trace/identities
        [HttpPost("trace/identities")]
        public async Task<IActionResult> CreateTraceIdentity([FromBody] CreateTraceIdentityDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.IdentityCode))
                return BadRequest(new { message = "IdentityCode is required" });

            var exists = await _db.TraceIdentities.AnyAsync(x => x.IdentityCode == dto.IdentityCode);
            if (exists) return Conflict(new { message = "IdentityCode already exists" });

            var product = await _db.Products.FindAsync(dto.ProductId);
            if (product == null) return BadRequest(new { message = "Product not found" });

            var identity = new TraceIdentity
            {
                IdentityCode = dto.IdentityCode.Trim(),
                IdentityType = string.IsNullOrWhiteSpace(dto.IdentityType) ? "serial" : dto.IdentityType.Trim(),
                ProductId = dto.ProductId,
                ProjectName = dto.ProjectName,
                CurrentLocation = dto.CurrentLocation,
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Unknown" : dto.Status.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.TraceIdentities.Add(identity);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTraceById), new { id = identity.Id }, new { identity.Id });
        }

        // POST /api/warehousemanager/trace/{id}/events
        [HttpPost("trace/{id:int}/events")]
        public async Task<IActionResult> AppendTraceEvent([FromRoute] int id, [FromBody] AppendTraceEventDto dto)
        {
            var identity = await _db.TraceIdentities.FirstOrDefaultAsync(x => x.Id == id);
            if (identity == null) return NotFound(new { message = "Trace identity not found" });

            var ev = new TraceEvent
            {
                TraceIdentityId = id,
                EventType = string.IsNullOrWhiteSpace(dto.EventType) ? "import" : dto.EventType.Trim(),
                OccurredAt = dto.OccurredAt ?? DateTime.UtcNow,
                RefCode = dto.RefCode,
                Actor = dto.Actor,
                Note = dto.Note
            };

            _db.TraceEvents.Add(ev);

            identity.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(new { ev.Id });
        }
<<<<<<< HEAD

        [HttpPost("receiving-slips/export-selected")]
        public async Task<IActionResult> ExportSelectedReceivingSlips([FromBody] ReceivingExportRequestDto req)
        {
            if (req.Ids == null || req.Ids.Count == 0)
                return BadRequest(new { message = "Chưa có phiếu nào được chọn." });

            var slips = await _db.ReceivingSlips
                .Include(s => s.Items)
                .Where(s => req.Ids.Contains(s.Id))
                .OrderByDescending(s => s.ReceiptDate)
                .ThenByDescending(s => s.Id)
                .ToListAsync();

            using var wb = new ClosedXML.Excel.XLWorkbook();

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
                ws1.Cell(r, 4).Value = s.ReceiptDate; ws1.Cell(r, 4).Style.DateFormat.Format = "yyyy-mm-dd";
                ws1.Cell(r, 5).Value = s.Status.ToString();
                ws1.Cell(r, 6).Value = s.Note;
                ws1.Cell(r, 7).Value = totalItems;
                ws1.Cell(r, 8).Value = totalAmount; ws1.Cell(r, 8).Style.NumberFormat.Format = "#,##0.00";
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
                ws2.Range(r2, 1, r2, 11).Style.Font.SetBold(); r2++;

                foreach (var s in slips)
                {
                    foreach (var it in s.Items ?? new List<ReceivingSlipItem>())
                    {
                        ws2.Cell(r2, 1).Value = s.Id;
                        ws2.Cell(r2, 2).Value = s.ReferenceNo;
                        ws2.Cell(r2, 3).Value = s.Supplier;
                        ws2.Cell(r2, 4).Value = s.ReceiptDate; ws2.Cell(r2, 4).Style.DateFormat.Format = "yyyy-mm-dd";
                        ws2.Cell(r2, 5).Value = it.ProductId;
                        ws2.Cell(r2, 6).Value = it.ProductCode;
                        ws2.Cell(r2, 7).Value = it.ProductName;
                        ws2.Cell(r2, 8).Value = it.Uom;
                        ws2.Cell(r2, 9).Value = it.Quantity;
                        ws2.Cell(r2, 10).Value = it.UnitPrice; ws2.Cell(r2, 10).Style.NumberFormat.Format = "#,##0.00";
                        ws2.Cell(r2, 11).Value = it.Total; ws2.Cell(r2, 11).Style.NumberFormat.Format = "#,##0.00";
                        r2++;
                    }
                }
                ws2.Columns().AdjustToContents();
            }

            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            var fileBytes = ms.ToArray();

            var fileName = $"receiving-slips-selected-{DateTime.Now:yyyyMMdd-HHmm}.xlsx";
            const string contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            return File(fileBytes, contentType, fileName);
        }
=======
>>>>>>> 7e8d78edbb8a6d4fa2a76b595799b5af8983f878
    }
}
