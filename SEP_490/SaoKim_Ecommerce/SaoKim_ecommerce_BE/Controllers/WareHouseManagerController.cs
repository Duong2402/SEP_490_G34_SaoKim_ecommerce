﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/warehousemanager")]
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
            if (string.IsNullOrWhiteSpace(dto.ReferenceNo))
                return BadRequest(new { message = "ReferenceNo is required" });
            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new { message = "At least one item is required" });

            var dupRef = await _db.ReceivingSlips.AnyAsync(x => x.ReferenceNo == dto.ReferenceNo);
            if (dupRef) return Conflict(new { message = "ReferenceNo already exists" });

            var slip = new ReceivingSlip
            {
                Supplier = dto.Supplier.Trim(),
                ReceiptDate = dto.ReceiptDate,
                ReferenceNo = dto.ReferenceNo.Trim(),
                Note = dto.Note?.Trim(),
                Status = ReceivingSlipStatus.Draft,
                Items = dto.Items.Select(i => new ReceivingSlipItem
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName.Trim(),
                    Uom = i.Uom.Trim(),
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    Total = i.Quantity * i.UnitPrice
                }).ToList()
            };

            _db.ReceivingSlips.Add(slip);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetReceivingSlipItems), new { id = slip.Id }, new { slip.Id, slip.ReferenceNo });
        }


        [HttpGet("receiving-slips/{id:int}/items")]
        public async Task<IActionResult> GetReceivingSlipItems([FromRoute] int id)
        {
            var exists = await _db.ReceivingSlips.AnyAsync(x => x.Id == id);
            if (!exists) return NotFound(new { message = "Receiving slip not found" });

            var items = await _db.ReceivingSlipItems
                .Where(i => i.ReceivingSlipId == id)
                .OrderBy(i => i.Id)
                .Select(i => new
                {
                    i.Id,
                    i.ProductId,
                    i.ProductName,
                    i.Uom,
                    i.Quantity,
                    i.UnitPrice,
                    i.Total
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpPut("receiving-items/{itemId:int}/items")]
        public async Task<IActionResult> UpdateReceivingSlipItem([FromRoute] int itemId, [FromBody] ReceivingSlipItemDto dto)
        {
            var item = await _db.ReceivingSlipItems
                .Include(i => i.ReceivingSlip)
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

            // ✅ Tự động tạo Product nếu chưa có
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
                        Price = dto.UnitPrice
                    };
                    _db.Products.Add(product);
                    await _db.SaveChangesAsync();
                }
            }
            else
            {
                product = new Product
                {
                    ProductName = dto.ProductName.Trim(),
                    Unit = string.IsNullOrWhiteSpace(dto.Uom) ? "unit" : dto.Uom.Trim(),
                    Price = dto.UnitPrice
                };
                _db.Products.Add(product);
                await _db.SaveChangesAsync();
            }

            item.ProductId = product.ProductID;
            item.ProductName = product.ProductName;
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
                item.Uom,
                item.Quantity,
                item.UnitPrice,
                item.Total
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
            if (slip is null) return NotFound();

            if (slip.Status != ReceivingSlipStatus.Draft)
                return Conflict(new { message = "Only Draft slips can be deleted" });

            _db.ReceivingSlips.Remove(slip);
            await _db.SaveChangesAsync();
            return NoContent();
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

            // --- Bộ lọc ---
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


    }
}
