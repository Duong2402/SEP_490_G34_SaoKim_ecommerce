using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Models.Requests;
using SaoKim_ecommerce_BE.Services;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AddressesController : ControllerBase
    {
        private readonly IAddressesService _addressesService;

        public AddressesController(IAddressesService addressesService)
        {
            _addressesService = addressesService;
        }

        private int? GetUserId()
        {
            var s = User.FindFirst("UserId")?.Value
                    ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(s, out var id)) return id;
            return null;
        }

        // GET /api/addresses
        [HttpGet]
        public async Task<IActionResult> GetMine()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var list = await _addressesService.GetMineAsync(userId.Value);
            return Ok(list);
        }

        // POST /api/addresses
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAddressRequest req)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var result = await _addressesService.CreateAsync(userId.Value, req);
            return Ok(result);
        }

        // PUT /api/addresses/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] AddressUpdateRequest req)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            try
            {
                await _addressesService.UpdateAsync(userId.Value, id, req);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }

            return Ok();
        }

        // PUT /api/addresses/{id}/default
        [HttpPut("{id:int}/default")]
        public async Task<IActionResult> SetDefault(int id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            try
            {
                await _addressesService.SetDefaultAsync(userId.Value, id);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }

            return Ok();
        }

        // DELETE /api/addresses/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            try
            {
                await _addressesService.DeleteAsync(userId.Value, id);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }

            return Ok();
        }
    }
}
