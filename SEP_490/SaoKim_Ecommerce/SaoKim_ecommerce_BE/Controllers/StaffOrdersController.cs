using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.Services;

[ApiController]
[Route("api/staff/orders")]
[Authorize(Roles = "staff,manager")]

public class StaffOrdersController : ControllerBase
{
    private readonly IStaffOrdersService _svc;

    public StaffOrdersController(IStaffOrdersService svc)
    {
        _svc = svc;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? q = null,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? createdFrom = null,
        [FromQuery] DateTime? createdTo = null,
        [FromQuery] string sortBy = "created",
        [FromQuery] string sortDir = "desc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _svc.GetListAsync(q, status, createdFrom, createdTo, sortBy, sortDir, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var dto = await _svc.GetByIdAsync(id);
        if (dto == null) return NotFound(new { message = "Không tìm thấy đơn hàng" });
        return Ok(dto);
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusRequest req)
    {
        await _svc.UpdateStatusAsync(id, req.Status);
        return NoContent();
    }

    [HttpGet("{id:int}/items")]
    public async Task<IActionResult> GetItems(int id)
    {
        var items = await _svc.GetItemsAsync(id);
        return Ok(items);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _svc.DeleteAsync(id);
        return NoContent();
    }

    public class UpdateOrderStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}
