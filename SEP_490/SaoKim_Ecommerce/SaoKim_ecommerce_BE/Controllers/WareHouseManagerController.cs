using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Hubs;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/warehousemanager")]
    [Authorize(Roles = "warehouse_manager")]
    public class WarehouseManagerController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        private readonly IHubContext<ReceivingHub> _receivingHub;
        private readonly IHubContext<DispatchHub> _dispatchHub;
        private readonly IHubContext<InventoryHub> _inventoryHub;
        private readonly IReceivingService _receivingService;
        private readonly IDispatchService _dispatchService;
        private readonly IWarehouseReportService _warehouseReportService;


        public WarehouseManagerController(SaoKimDBContext db, IHubContext<ReceivingHub> receivingHub,
            IHubContext<DispatchHub> dispatchHub, IHubContext<InventoryHub> inventoryHub,
            IReceivingService receivingService,
            IDispatchService dispatchService,
            IWarehouseReportService warehouseReportService)
        {
            _db = db;
            _receivingHub = receivingHub;
            _dispatchHub = dispatchHub;
            _inventoryHub = inventoryHub;
            _receivingService = receivingService;
            _dispatchService = dispatchService;
            _warehouseReportService = warehouseReportService;
        }

        [HttpGet("receiving-slips")]
        public async Task<IActionResult> GetReceivingSlipList([FromQuery] ReceivingSlipListQuery q)
        {
            var result = await _receivingService.GetReceivingSlipListAsync(q);
            return Ok(result);
        }

        [HttpPost("receiving-slips")]
        public async Task<IActionResult> CreateReceivingSlip([FromBody] ReceivingSlipCreateDto dto)
        {
            try
            {
                var slip = await _receivingService.CreateReceivingSlipAsync(dto);

                return CreatedAtAction(
                    nameof(GetReceivingSlipItems),
                    new { id = slip.Id },
                    new { slip.Id, slip.ReferenceNo }
                );
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("receiving-slips/{id:int}/items")]
        public async Task<IActionResult> GetReceivingSlipItems([FromRoute] int id)
        {
            var slip = await _db.ReceivingSlips
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (slip == null)
                return NotFound(new { message = "Phiếu nhập không tồn tại" });

            var items = slip.Items
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
                .ToList();

            return Ok(new
            {
                status = slip.Status,
                supplier = slip.Supplier,
                items
            });
        }

        [HttpDelete("receiving-slips/{id:int}")]
        public async Task<IActionResult> DeleteReceivingSlip([FromRoute] int id)
        {
            try
            {
                await _receivingService.DeleteReceivingSlipAsync(id);

                await _receivingHub.Clients.All.SendAsync("ReceivingSlipsUpdated", new
                {
                    action = "deleted",
                    id
                });

                return Ok(new { message = "Phiếu đã được đưa vào thùng rác." });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Phiếu nhập không tìm thấy" });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpPut("receiving-items/{itemId:int}")]
        public async Task<IActionResult> UpdateReceivingSlipItem(
    [FromRoute] int itemId,
    [FromBody] ReceivingSlipItemDto dto)
        {
            try
            {
                var item = await _receivingService.UpdateReceivingSlipItemAsync(itemId, dto);

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
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


        [HttpPost("receiving-slips/{id:int}/items")]
        public async Task<IActionResult> CreateReceivingSlipItem(
    [FromRoute] int id,
    [FromBody] ReceivingSlipItemDto dto)
        {
            try
            {
                var newItem = await _receivingService.CreateReceivingSlipItemAsync(id, dto);

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
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("receiving-items/{itemId:int}")]
        public async Task<IActionResult> DeleteReceivingSlipItem([FromRoute] int itemId)
        {
            try
            {
                var result = await _receivingService.DeleteReceivingSlipItemAsync(itemId);

                await _receivingHub.Clients.All.SendAsync("ReceivingItemsUpdated", new
                {
                    action = "deleted",
                    slipId = result.SlipId,
                    itemId = result.ItemId
                });

                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống khi xóa dòng sản phẩm." });
            }
        }

        [HttpPost("receiving-slips/import")]
        public async Task<IActionResult> ImportReceivingSlips(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Vui lòng chọn file Excel hợp lệ." });

            try
            {
                using var stream = new MemoryStream();
                await file.CopyToAsync(stream);

                var count = await _receivingService.ImportReceivingSlipsAsync(stream, "warehouse-manager");

                await _receivingHub.Clients.All.SendAsync("ReceivingSlipsUpdated", new
                {
                    action = "imported",
                    count
                });

                return Ok(new { message = $"Đã nhập {count} phiếu thành công!" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Có lỗi xảy ra khi import phiếu nhập kho." });
            }
        }

        [HttpPost("receiving-slips/{id:int}/confirm")]
        public async Task<IActionResult> ConfirmReceivingSlip([FromRoute] int id)
        {
            try
            {
                var result = await _receivingService.ConfirmReceivingSlipAsync(id);

                await _receivingHub.Clients.All.SendAsync("ReceivingSlipsUpdated", new
                {
                    action = "confirmed",
                    result.Id,
                    result.ReferenceNo,
                    result.Supplier,
                    result.ReceiptDate,
                    result.Status,
                    result.CreatedAt,
                    result.ConfirmedAt
                });

                return Ok(result);

            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Phiếu nhập không tồn tại." });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Có lỗi xảy ra khi xác nhận phiếu nhập." });
            }
        }


        [HttpPost("dispatch-slips/{id:int}/confirm")]
        public async Task<IActionResult> ConfirmDispatchSlip([FromRoute] int id)
        {
            try
            {
                var result = await _dispatchService.ConfirmDispatchSlipAsync(id);

                await _dispatchHub.Clients.All.SendAsync("DispatchSlipsUpdated", new
                {
                    action = "confirmed",
                    result.Id,
                    result.Status,
                    result.ConfirmedAt
                });

                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("inbound-report")]
        public async Task<IActionResult> GetInboundReport([FromQuery] InboundReportQuery q)
        {
            var report = await _warehouseReportService.GetInboundReportAsync(q);
            return Ok(report);
        }

        [HttpGet("inbound-report/export")]
        public async Task<IActionResult> ExportInboundReport([FromQuery] InboundReportQuery q)
        {
            var data = await _warehouseReportService.GetInboundReportAsync(q);
            return Ok(data);
        }

        [HttpGet("outbound-report")]
        public async Task<IActionResult> GetOutboundReport([FromQuery] OutboundReportQuery q)
        {
            var report = await _warehouseReportService.GetOutboundReportAsync(q);
            return Ok(report);
        }

        [AllowAnonymous]
        [HttpGet("download-template")]
        public IActionResult DownloadTemplate()
        {
            var templatePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                "templates",
                "receiving_template.xlsx"
            );

            if (!System.IO.File.Exists(templatePath))
            {
                return NotFound(new { message = "Không tìm thấy file mẫu Excel." });
            }

            var fileBytes = System.IO.File.ReadAllBytes(templatePath);

            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                Path.GetFileName(templatePath)
            );
        }

        [HttpPatch("receiving-slips/{id:int}")]
        public async Task<IActionResult> UpdateSupplier([FromRoute] int id, [FromBody] SupplierUpdateDto dto)
        {
            try
            {
                var slip = await _receivingService.UpdateSupplierAsync(id, dto);

                await _receivingHub.Clients.All.SendAsync("ReceivingSlipsUpdated", new
                {
                    action = "updated",
                    slip.Id,
                    slip.ReferenceNo,
                    slip.Supplier,
                    slip.ReceiptDate,
                    slip.Status,
                    slip.CreatedAt,
                    slip.ConfirmedAt
                });

                return Ok(new { slip.Id, slip.Supplier });
            }
            catch (ArgumentNullException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpGet("dispatch-slips")]
        public async Task<IActionResult> GetDispatchSlips([FromQuery] DispatchSlipListQuery q)
        {
            var result = await _dispatchService.GetDispatchSlipsAsync(q);
            return Ok(result);
        }

        [HttpGet("receiving-slips/weekly-summary")]
        public async Task<IActionResult> GetWeeklyInboundSummary()
        {
            var result = await _warehouseReportService.GetWeeklyInboundSummaryAsync();
            return Ok(result);
        }

        [HttpGet("dispatch-slips/weekly-summary")]
        public async Task<IActionResult> GetWeeklyOutboundSummary()
        {
            var result = await _warehouseReportService.GetWeeklyOutboundSummaryAsync();
            return Ok(result);
        }

        [HttpGet("total-stock")]
        public async Task<IActionResult> GetTotalStock()
        {
            var result = await _warehouseReportService.GetTotalStockAsync();
            return Ok(result);
        }

        [AllowAnonymous]
        [HttpGet("unit-of-measures")]
        public async Task<IActionResult> GetUnitOfMeasures()
        {
            var result = await _warehouseReportService.GetUnitOfMeasuresAsync();
            return Ok(result);
        }

        [HttpGet("customers")]
        public async Task<IActionResult> GetCustomers([FromQuery] string? search)
        {
            var items = await _dispatchService.GetCustomersAsync(search);
            return Ok(items);
        }

        [HttpGet("projects")]
        public async Task<IActionResult> GetProjects([FromQuery] string? search)
        {
            var items = await _dispatchService.GetProjectsAsync(search);
            return Ok(items);
        }

        [HttpPost("dispatch-slips/sales")]
        public async Task<IActionResult> CreateSales([FromBody] RetailDispatchCreateDto dto)
        {
            try
            {
                var slip = await _dispatchService.CreateSalesDispatchAsync(dto);

                await _dispatchHub.Clients.All.SendAsync("DispatchSlipsUpdated", new
                {
                    action = "created",
                    id = slip.Id,
                    referenceNo = slip.ReferenceNo,
                    type = slip.Type,
                    status = slip.Status,
                    customerName = slip.CustomerName,
                    dispatchDate = slip.DispatchDate,
                    createdAt = slip.CreatedAt,
                    confirmedAt = slip.ConfirmedAt,
                    note = slip.Note
                });

                return CreatedAtAction(nameof(GetById), new { id = slip.Id }, new
                {
                    slip.Id,
                    slip.ReferenceNo,
                    slip.Type,
                    slip.Status,
                    receivedCustomerId = dto.CustomerId
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message, received = dto.CustomerId });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost("dispatch-slips/projects")]
        public async Task<IActionResult> CreateProject([FromBody] ProjectDispatchCreateDto dto)
        {
            try
            {
                var slip = await _dispatchService.CreateProjectDispatchAsync(dto);

                await _dispatchHub.Clients.All.SendAsync("DispatchSlipsUpdated", new
                {
                    action = "created",
                    id = slip.Id,
                    referenceNo = slip.ReferenceNo,
                    type = slip.Type,
                    status = slip.Status,
                    projectName = slip.ProjectName,
                    dispatchDate = slip.DispatchDate,
                    createdAt = slip.CreatedAt,
                    confirmedAt = slip.ConfirmedAt,
                    note = slip.Note
                });

                return CreatedAtAction(nameof(GetById), new { id = slip.Id }, new
                {
                    slip.Id,
                    slip.ReferenceNo,
                    slip.Type,
                    slip.Status,
                    receivedProjectId = dto.ProjectId
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message, received = dto.ProjectId });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("dispatch-slips/{id:int}")]
        public async Task<IActionResult> GetById([FromRoute] int id)
        {
            var dto = await _dispatchService.GetDispatchByIdAsync(id);
            if (dto == null) return NotFound();
            return Ok(dto);
        }

        [HttpGet("dispatch-slips/{id:int}/items")]
        public async Task<IActionResult> GetDispatchItems([FromRoute] int id, [FromQuery] DispatchItemListQuery q)
        {
            try
            {
                var result = await _dispatchService.GetDispatchItemsAsync(id, q);

                var baseQuery = _db.DispatchItems.Where(i => i.DispatchId == id);

                var totalQty = await baseQuery.SumAsync(i => (int?)i.Quantity) ?? 0;
                var totalAmount = await baseQuery
    .SumAsync(i => (double?)(i.Quantity * i.UnitPrice)) ?? 0;

                return Ok(new
                {
                    total = result.TotalItems,       
                    page = result.Page,
                    pageSize = result.PageSize,
                    items = result.Items,            
                    totalQty = totalQty,
                    totalAmount = totalAmount
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }


        [HttpPost("dispatch-slips/{id:int}/items")]
        public async Task<IActionResult> CreateDispatchItem(int id, [FromBody] DispatchItemDto dto)
        {
            try
            {
                var result = await _dispatchService.CreateDispatchItemAsync(id, dto);

                await _dispatchHub.Clients.All.SendAsync("DispatchItemsUpdated", new
                {
                    action = "created",
                    dispatchId = id,
                    item = result
                });

                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("dispatch-items/{itemId:int}")]
        public async Task<IActionResult> UpdateDispatchItem(int itemId, [FromBody] DispatchItemDto dto)
        {
            try
            {
                var (item, productCode) = await _dispatchService.UpdateDispatchItemAsync(itemId, dto);

                var response = new
                {
                    item.Id,
                    item.DispatchId,
                    item.ProductId,
                    item.ProductName,
                    ProductCode = productCode,
                    item.Uom,
                    item.Quantity,
                    item.UnitPrice,
                    item.Total
                };

                await _dispatchHub.Clients.All.SendAsync("DispatchItemsUpdated", new
                {
                    action = "updated",
                    dispatchId = item.DispatchId,
                    item = response
                });

                return Ok(response);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("dispatch-slips/{id:int}")]
        public async Task<IActionResult> DeleteDispatchSlip(int id)
        {
            try
            {
                await _dispatchService.DeleteDispatchSlipAsync(id);

                await _dispatchHub.Clients.All.SendAsync("DispatchSlipsUpdated", new
                {
                    action = "deleted",
                    id
                });

                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpDelete("dispatch-items/{itemId:int}")]
        public async Task<IActionResult> DeleteDispatchItem(int itemId)
        {
            try
            {
                var item = await _db.DispatchItems.FindAsync(itemId);
                if (item == null)
                    return NotFound(new { message = $"Item {itemId} không tồn tại" });

                var dispatchId = item.DispatchId;

                await _dispatchService.DeleteDispatchItemAsync(itemId);

                await _dispatchHub.Clients.All.SendAsync("DispatchItemsUpdated", new
                {
                    action = "deleted",
                    dispatchId,
                    itemId
                });

                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("inventory")]
        public async Task<IActionResult> GetInventory([FromQuery] InventoryListQuery q)
        {
            var result = await _warehouseReportService.GetInventoryAsync(q);
            return Ok(result);
        }

        [HttpGet("inventory-report")]
        public async Task<IActionResult> GetInventoryReport([FromQuery] InventoryListQuery q)
        {
            var result = await _warehouseReportService.GetInventoryReportAsync(q);

            return Ok(new
            {
                total = result.TotalItems,
                items = result.Items
            });
        }

        [HttpPatch("inventory/{productId:int}/min-stock")]
        public async Task<IActionResult> UpdateMinStock([FromRoute] int productId, [FromBody] UpdateMinStockDto dto)
        {
            try
            {
                var threshold = await _warehouseReportService.UpdateMinStockAsync(productId, dto.MinStock);

                await _inventoryHub.Clients.All.SendAsync("InventoryUpdated", new
                {
                    productId,
                    minStock = threshold.MinStock
                });

                return Ok(new { productId, minStock = threshold.MinStock });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("trace")]
        public async Task<IActionResult> SearchTrace([FromQuery] TraceSearchQuery q)
        {
            var items = await _warehouseReportService.SearchTraceAsync(q);
            return Ok(items);
        }

        [HttpGet("trace/product/{productId:int}")]
        public async Task<IActionResult> GetProductTrace([FromRoute] int productId)
        {
            var result = await _warehouseReportService.GetProductTraceAsync(productId);

            if (result == null)
                return NotFound(new { message = "Product not found" });

            return Ok(result);
        }

        [HttpPost("receiving-slips/export-selected")]
        public async Task<IActionResult> ExportSelectedReceivingSlips([FromBody] ReceivingExportRequestDto req)
        {
            try
            {
                var fileBytes = await _receivingService.ExportSelectedReceivingSlipsAsync(req);

                var fileName = $"receiving-slips-selected-{DateTime.Now:yyyyMMdd-HHmm}.xlsx";
                const string contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                return File(fileBytes, contentType, fileName);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("dispatch-slips/export-by-filter")]
        public async Task<IActionResult> ExportDispatchByFilter([FromBody] DispatchSlipListQuery q)
        {
            q.Page = 1;
            q.PageSize = int.MaxValue;

            var result = await _dispatchService.GetDispatchSlipsAsync(q);
            var ids = result.Items.Select(x => x.Id).ToList();

            if (!ids.Any())
                return BadRequest(new { message = "Không có dữ liệu để xuất." });

            var bytes = await _dispatchService.ExportDispatchSlipsAsync(ids, includeItems: true);

            var fileName = $"dispatch-slips-{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx";
            const string contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

            return File(bytes, contentType, fileName);
        }


        [HttpPost("dispatch-slips/export-selected")]
        public async Task<IActionResult> ExportDispatchSelected(
    [FromBody] DispatchExportSelectedRequest request)
        {
            if (request.Ids == null || request.Ids.Count == 0)
                return BadRequest(new { message = "Không có phiếu xuất nào được chọn." });

            var bytes = await _dispatchService.ExportDispatchSlipsAsync(
                request.Ids,
                request.IncludeItems);

            var fileName = $"dispatch-slips-{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx";
            const string contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

            return File(bytes, contentType, fileName);
        }

        [HttpGet("dispatch-slips/{id}/print")]
        public async Task<IActionResult> PrintDispatch(int id)
        {
            var pdf = await _dispatchService.ExportDispatchSlipPdfAsync(id);
            var fileName = $"PhieuXuat_{id}.pdf";
            return File(pdf, "application/pdf", fileName);
        }


    }
}
