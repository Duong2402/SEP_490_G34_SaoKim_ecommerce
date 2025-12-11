using DocumentFormat.OpenXml.Office2016.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Services;

[ApiController]
[AllowAnonymous]
[Route("api/[controller]")]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _svc;
    private readonly IWebHostEnvironment _env;

    public InvoicesController(IInvoiceService svc, IWebHostEnvironment env)
    {
        _svc = svc;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] InvoiceQuery q)
        => Ok(await _svc.GetListAsync(q));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var dto = await _svc.GetByIdAsync(id);
        return dto == null
            ? NotFound(new { message = "Không tìm thấy hóa đơn" })
            : Ok(dto);
    }

    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateInvoiceStatusDto body)
    {
        await _svc.UpdateStatusAsync(id, body.Status);
        return Ok(new { message = "Cập nhật trạng thái hóa đơn thành công" });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _svc.DeleteAsync(id);
        return Ok(new { message = "Xóa hóa đơn thành công" });
    }

    [HttpPost("{id:int}/generate-pdf")]
    public async Task<IActionResult> GeneratePdf(int id)
    {
        var folder = Path.Combine(_env.WebRootPath ?? "wwwroot", "invoices");
        await _svc.GeneratePdfAsync(id, folder);
        return Ok(new { message = "Tạo PDF thành công" });
    }

    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> DownloadPdf(int id, [FromQuery] bool inline = false)
    {
        var folder = Path.Combine(_env.WebRootPath ?? "wwwroot", "invoices");
        var path = await _svc.GetPdfPathAsync(id, folder);

        if (path == null)
            return NotFound(new { message = "Không tìm thấy PDF" });

        var fileName = Path.GetFileName(path);

        if (inline)
            return PhysicalFile(path, "application/pdf");

        return PhysicalFile(path, "application/pdf", fileName);
    }

    [HttpDelete("{id:int}/pdf")]
    public async Task<IActionResult> DeletePdf(int id)
    {
        var folder = Path.Combine(_env.WebRootPath ?? "wwwroot", "invoices");
        await _svc.DeletePdfAsync(id, folder);
        return Ok(new { message = "Đã xóa PDF" });
    }

    [HttpPost("{id:int}/send-email")]
    public async Task<IActionResult> SendEmail(int id)
    {
        var pdfUrl = $"{Request.Scheme}://{Request.Host}/api/invoices/{id}/pdf";
        await _svc.SendInvoiceEmailAsync(id, pdfUrl);
        return Ok(new { message = "Đã gửi email hóa đơn" });
    }
}