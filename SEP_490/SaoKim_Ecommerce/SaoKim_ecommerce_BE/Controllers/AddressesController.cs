using System;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models.Requests;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AddressesController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly string _googleApiKey;
        private readonly ILogger<AddressesController> _logger;

        public AddressesController(
            SaoKimDBContext db,
            IConfiguration config,
            IHttpClientFactory httpClientFactory,
            ILogger<AddressesController> logger)
        {
            _db = db;
            _httpClientFactory = httpClientFactory;
            _logger = logger;

            _googleApiKey = config.GetValue<string>("GoogleMaps:ApiKey") ?? string.Empty;
            _logger.LogInformation("GoogleMaps ApiKey length: {len}", _googleApiKey.Length);
        }

        private int? GetUserId()
        {
            var s = User.FindFirst("UserId")?.Value;
            if (int.TryParse(s, out var id)) return id;
            return null;
        }

        private async Task<(double? lat, double? lng)> GeocodeAsync(string address)
        {
            if (string.IsNullOrWhiteSpace(_googleApiKey))
            {
                _logger.LogWarning("GeocodeAsync: Google API key is empty");
                return (null, null);
            }

            var url =
                $"https://maps.googleapis.com/maps/api/geocode/json?address={Uri.EscapeDataString(address)}&key={_googleApiKey}";

            _logger.LogInformation("GeocodeAsync: calling {url}", url);

            var client = _httpClientFactory.CreateClient();

            HttpResponseMessage resp;
            try
            {
                resp = await client.GetAsync(url);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GeocodeAsync: HttpClient exception");
                return (null, null);
            }

            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("GeocodeAsync: HTTP status {status}", resp.StatusCode);
                return (null, null);
            }

            var json = await resp.Content.ReadAsStringAsync();
            _logger.LogInformation("GeocodeAsync: response snippet {snippet}",
                json.Length > 300 ? json.Substring(0, 300) : json);

            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                var status = root.GetProperty("status").GetString();
                _logger.LogInformation("GeocodeAsync: status = {status}", status);

                if (!string.Equals(status, "OK", StringComparison.OrdinalIgnoreCase))
                    return (null, null);

                var results = root.GetProperty("results");
                if (results.GetArrayLength() == 0) return (null, null);

                var location = results[0]
                    .GetProperty("geometry")
                    .GetProperty("location");

                var lat = location.GetProperty("lat").GetDouble();
                var lng = location.GetProperty("lng").GetDouble();

                return (lat, lng);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GeocodeAsync: parse JSON error");
                return (null, null);
            }
        }

        // GET /api/addresses
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
                    Ward = a.Ward,
                    District = a.District,
                    Province = a.Province,
                    IsDefault = a.IsDefault,
                    Latitude = a.Latitude,
                    Longitude = a.Longitude
                })
                .ToListAsync();

            return Ok(list);
        }

        // POST /api/addresses  
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAddressRequest req)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            if (req.IsDefault)
            {
                var prev = await _db.Addresses
                    .Where(a => a.UserId == userId && a.IsDefault)
                    .ToListAsync();

                foreach (var a in prev) a.IsDefault = false;
            }

            var entity = new Address
            {
                UserId = userId.Value,
                RecipientName = req.RecipientName,
                PhoneNumber = req.PhoneNumber,
                Line1 = req.Line1,
                Ward = req.Ward,
                District = req.District,
                Province = req.Province,
                IsDefault = req.IsDefault,
                Latitude = req.Latitude,
                Longitude = req.Longitude,
                CreateAt = DateTime.UtcNow
            };

            if (entity.Latitude == null || entity.Longitude == null)
            {
                var fullAddress =
                    $"{entity.Line1}, {entity.Ward}, {entity.District}, {entity.Province}, Việt Nam";
                _logger.LogInformation("Create: geocoding address {addr}", fullAddress);

                var (lat, lng) = await GeocodeAsync(fullAddress);
                if (lat.HasValue && lng.HasValue)
                {
                    entity.Latitude = lat;
                    entity.Longitude = lng;
                }
            }

            _db.Addresses.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                addressId = entity.AddressId,
                recipientName = entity.RecipientName,
                phoneNumber = entity.PhoneNumber,
                line1 = entity.Line1,
                ward = entity.Ward,
                district = entity.District,
                province = entity.Province,
                isDefault = entity.IsDefault,
                latitude = entity.Latitude,
                longitude = entity.Longitude
            });
        }

        // PUT /api/addresses/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] AddressUpdateRequest req)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var entity = await _db.Addresses
                .FirstOrDefaultAsync(a => a.AddressId == id && a.UserId == userId);
            if (entity == null) return NotFound();

            if (req.IsDefault && !entity.IsDefault)
            {
                var prev = await _db.Addresses
                    .Where(a => a.UserId == userId && a.IsDefault)
                    .ToListAsync();

                foreach (var a in prev) a.IsDefault = false;
            }

            entity.RecipientName = req.RecipientName;
            entity.PhoneNumber = req.PhoneNumber;
            entity.Line1 = req.Line1;
            entity.Ward = req.Ward;
            entity.District = req.District;
            entity.Province = req.Province;
            entity.IsDefault = req.IsDefault;
            entity.Latitude = req.Latitude;
            entity.Longitude = req.Longitude;
            entity.UpdateAt = DateTime.UtcNow;

            if (entity.Latitude == null || entity.Longitude == null)
            {
                var fullAddress =
                    $"{entity.Line1}, {entity.Ward}, {entity.District}, {entity.Province}, Việt Nam";
                _logger.LogInformation("Update: geocoding address {addr}", fullAddress);

                var (lat, lng) = await GeocodeAsync(fullAddress);
                if (lat.HasValue && lng.HasValue)
                {
                    entity.Latitude = lat;
                    entity.Longitude = lng;
                }
            }

            await _db.SaveChangesAsync();
            return Ok();
        }

        // PUT /api/addresses/{id}/default
        [HttpPut("{id:int}/default")]
        public async Task<IActionResult> SetDefault(int id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var entity = await _db.Addresses
                .FirstOrDefaultAsync(a => a.AddressId == id && a.UserId == userId);
            if (entity == null) return NotFound();

            var prev = await _db.Addresses
                .Where(a => a.UserId == userId && a.IsDefault)
                .ToListAsync();

            foreach (var a in prev) a.IsDefault = false;
            entity.IsDefault = true;

            await _db.SaveChangesAsync();
            return Ok();
        }

        // DELETE /api/addresses/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var entity = await _db.Addresses
                .FirstOrDefaultAsync(a => a.AddressId == id && a.UserId == userId);
            if (entity == null) return NotFound();

            _db.Addresses.Remove(entity);
            await _db.SaveChangesAsync();
            return Ok();
        }
    }
}
