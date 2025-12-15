using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/projects")]
    public class ProjectReportsController : ControllerBase
    {
        private readonly IProjectReportsService _svc;

        public ProjectReportsController(IProjectReportsService svc)
        {
            _svc = svc;
        }

        // GET: /api/projects/{id}/report
        [HttpGet("{id:int}/report")]
        public async Task<IActionResult> GetReportJson(int id)
        {
            var dto = await _svc.GetProjectReportAsync(id);
            if (dto == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy dự án"));

            return Ok(ApiResponse<ProjectReportDTOs>.Ok(dto));
        }

        // GET: /api/projects/{id}/report/pdf
        [HttpGet("{id:int}/report/pdf")]
        public async Task<IActionResult> GetReportPdf(int id)
        {
            var pdfBytes = await _svc.GetProjectReportPdfAsync(id);
            if (pdfBytes == null)
                return NotFound(ApiResponse<string>.Fail("Không tìm thấy dự án"));

            var dto = await _svc.GetProjectReportAsync(id)!; // để lấy Code đặt tên file
            var fileName = $"ProjectReport_{dto?.Code ?? id.ToString()}.pdf";

            return File(pdfBytes, "application/pdf", fileName);
        }
    }
}
