using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/manager/employees")]
    [Authorize(Roles = "manager")]
    public class ManagerEmployeesController : ControllerBase
    {
        private readonly IManagerEmployeesService _svc;

        public ManagerEmployeesController(IManagerEmployeesService svc)
        {
            _svc = svc;
        }

        // GET /api/manager/employees
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? q,
            [FromQuery] string? role,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            page = Math.Max(1, page);
            pageSize = Math.Max(1, pageSize);

            var (items, total) = await _svc.GetAllAsync(q, role, status, page, pageSize);

            return Ok(new
            {
                items,
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling(total / (double)pageSize)
            });
        }

        // GET /api/manager/employees/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var dto = await _svc.GetByIdAsync(id);
            if (dto == null)
                return NotFound(new { message = "Không tìm thấy nhân viên" });

            return Ok(dto);
        }

        // POST /api/manager/employees
        [HttpPost]
        [RequestSizeLimit(10_000_000)]
        public async Task<IActionResult> CreateEmployee([FromForm] EmployeeCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var id = await _svc.CreateEmployeeAsync(dto);
                return Ok(new
                {
                    message = "Nhân viên tạo thành công",
                    id
                });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT /api/manager/employees/{id}
        [HttpPut("{id:int}")]
        [RequestSizeLimit(10_000_000)]
        public async Task<IActionResult> UpdateEmployee(int id, [FromForm] EmployeeUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                await _svc.UpdateEmployeeAsync(id, dto);
                return Ok(new { message = "Nhân viên đã được cập nhật" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE /api/manager/employees/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteEmployee(int id)
        {
            try
            {
                await _svc.DeleteEmployeeAsync(id);
                return Ok(new { message = "Nhân viên đã bị xóa" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET /api/manager/employees/roles
        [HttpGet("roles")]
        public async Task<IActionResult> GetRolesForEmployees()
        {
            var roles = await _svc.GetRolesAsync();
            return Ok(roles);
        }
    }
}
