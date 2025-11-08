using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/projects/{projectId:int}/products")]
    public class ProjectProductsController : ControllerBase
    {
        private readonly IProjectProductService _service;

        public ProjectProductsController(IProjectProductService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetList(int projectId)
        {
            try
            {
                var res = await _service.GetProductsAsync(projectId);
                return Ok(ApiResponse<ProjectProductListDTO>.Ok(res));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<string>.Fail(ex.Message));
            }
        }

        [HttpPost]
        public async Task<IActionResult> Add(int projectId, [FromBody] ProjectProductCreateDTO dto)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            try
            {
                var res = await _service.AddProductAsync(projectId, dto);
                return Ok(ApiResponse<ProjectProductItemDTO>.Ok(res, "Added"));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<string>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ApiResponse<string>.Fail(ex.Message));
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int projectId, int id, [FromBody] ProjectProductUpdateDTO dto)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var res = await _service.UpdateProductAsync(projectId, id, dto);
            if (res == null) return NotFound(ApiResponse<string>.Fail("Item not found"));

            return Ok(ApiResponse<ProjectProductItemDTO>.Ok(res, "Updated"));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int projectId, int id)
        {
            var ok = await _service.RemoveProductAsync(projectId, id);
            if (!ok) return NotFound(ApiResponse<string>.Fail("Item not found"));

            return Ok(ApiResponse<string>.Ok("Deleted"));
        }
    }
}
