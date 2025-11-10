using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AddressesController : ControllerBase
    {
        private readonly SaoKimDBContext _db;

        public AddressesController(SaoKimDBContext db)
        {
            _db = db;
        }

        private int? GetUserId()
        {
            var s = User.FindFirst("UserId")?.Value;
            if (int.TryParse(s, out var id)) return id;
            return null;
        }

        [HttpGet]
        public async Task<IActionResult> GetMine()
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();
            var list = await _db.Addresses
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.IsDefault)
                .ThenByDescending(a => a.CreateAt)
                .Select(a => new AddressResponse
                {
                    AddressId = a.AddressId,
                    RecipientName = a.RecipientName,
                    PhoneNumber = a.PhoneNumber,
                    Line1 = a.Line1,
                    Line2 = a.Line2,
                    Ward = a.Ward,
                    District = a.District,
                    Province = a.Province,
                    IsDefault = a.IsDefault
                })
                .ToListAsync();
            return Ok(list);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] AddressCreateRequest req)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            if (req.IsDefault)
            {
                var prev = await _db.Addresses.Where(a => a.UserId == userId && a.IsDefault).ToListAsync();
                foreach (var a in prev) a.IsDefault = false;
            }

            var entity = new Address
            {
                UserId = userId.Value,
                RecipientName = req.RecipientName,
                PhoneNumber = req.PhoneNumber,
                Line1 = req.Line1,
                Line2 = req.Line2,
                Ward = req.Ward,
                District = req.District,
                Province = req.Province,
                IsDefault = req.IsDefault,
                CreateAt = DateTime.UtcNow
            };
            _db.Addresses.Add(entity);
            await _db.SaveChangesAsync();
            return Ok(new { id = entity.AddressId });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] AddressUpdateRequest req)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var entity = await _db.Addresses.FirstOrDefaultAsync(a => a.AddressId == id && a.UserId == userId);
            if (entity == null) return NotFound();

            if (req.IsDefault && !entity.IsDefault)
            {
                var prev = await _db.Addresses.Where(a => a.UserId == userId && a.IsDefault).ToListAsync();
                foreach (var a in prev) a.IsDefault = false;
            }

            entity.RecipientName = req.RecipientName;
            entity.PhoneNumber = req.PhoneNumber;
            entity.Line1 = req.Line1;
            entity.Line2 = req.Line2;
            entity.Ward = req.Ward;
            entity.District = req.District;
            entity.Province = req.Province;
            entity.IsDefault = req.IsDefault;
            entity.UpdateAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok();
        }

        [HttpPut("{id:int}/default")]
        public async Task<IActionResult> SetDefault(int id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();
            var entity = await _db.Addresses.FirstOrDefaultAsync(a => a.AddressId == id && a.UserId == userId);
            if (entity == null) return NotFound();

            var prev = await _db.Addresses.Where(a => a.UserId == userId && a.IsDefault).ToListAsync();
            foreach (var a in prev) a.IsDefault = false;
            entity.IsDefault = true;
            await _db.SaveChangesAsync();
            return Ok();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();
            var entity = await _db.Addresses.FirstOrDefaultAsync(a => a.AddressId == id && a.UserId == userId);
            if (entity == null) return NotFound();
            _db.Addresses.Remove(entity);
            await _db.SaveChangesAsync();
            return Ok();
        }
    }
}



