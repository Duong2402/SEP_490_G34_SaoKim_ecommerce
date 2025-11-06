using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
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
                int? productId = i.ProductId;

                if (productId == null || productId == 0)
                {
                    var newProduct = new Product
                    {
                        ProductName = i.ProductName.Trim(),
                        Unit = i.Uom.Trim(),
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
                    Uom = i.Uom.Trim(),
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
                .Include(i => i.Product) // include để dễ update Product
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

            Product? product = null;

            if (dto.ProductId.HasValue && dto.ProductId.Value != 0)
            {
                product = await _db.Products.FirstOrDefaultAsync(p => p.ProductID == dto.ProductId.Value);
                if (product == null)
                {
                    product = new Product
                    {
                        ProductName = dto.ProductName.Trim(),
                        Unit = string.IsNullOrWhiteSpace(dto.Uom) ? "unit" : dto.Uom.Trim(),
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
                    product.Unit = string.IsNullOrWhiteSpace(dto.Uom) ? "unit" : dto.Uom.Trim();
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
                    Unit = string.IsNullOrWhiteSpace(dto.Uom) ? "unit" : dto.Uom.Trim(),
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

            Product? product = null;

            if (dto.ProductId.HasValue)
            {
                product = await _db.Products.FirstOrDefaultAsync(p => p.ProductID == dto.ProductId.Value);
                if (product == null)
                {
                    product = new Product
                    {
                        ProductName = dto.ProductName.Trim(),
                        Unit = string.IsNullOrWhiteSpace(dto.Uom) ? "unit" : dto.Uom.Trim(),
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
                    Unit = string.IsNullOrWhiteSpace(dto.Uom) ? "unit" : dto.Uom.Trim(),
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
            var startOfThisWeek = today.AddDays(-dayOfWeek + 1); // Thứ 2
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
    }
}
