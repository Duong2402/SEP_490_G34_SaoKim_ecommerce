using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models.Requests;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Services
{
    public class AddressesService : IAddressesService
    {
        private readonly SaoKimDBContext _db;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly string _googleApiKey;
        private readonly ILogger<AddressesService> _logger;

        public AddressesService(
            SaoKimDBContext db,
            IConfiguration config,
            IHttpClientFactory httpClientFactory,
            ILogger<AddressesService> logger)
        {
            _db = db;
            _httpClientFactory = httpClientFactory;
            _logger = logger;

            _googleApiKey = config.GetValue<string>("GoogleMaps:ApiKey") ?? string.Empty;
            _logger.LogInformation("AddressesService - GoogleMaps ApiKey length: {len}", _googleApiKey.Length);
        }

        public async Task<IReadOnlyList<AddressResponse>> GetMineAsync(int userId)
        {
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

            return list;
        }

        public async Task<AddressResponse> CreateAsync(int userId, CreateAddressRequest req)
        {
            if (req.IsDefault)
            {
                var prev = await _db.Addresses
                    .Where(a => a.UserId == userId && a.IsDefault)
                    .ToListAsync();

                foreach (var a in prev)
                    a.IsDefault = false;
            }

            var entity = new Address
            {
                UserId = userId,
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
                _logger.LogInformation("AddressesService.CreateAsync: geocoding {addr}", fullAddress);

                var (lat, lng) = await GeocodeAsync(fullAddress);
                if (lat.HasValue && lng.HasValue)
                {
                    entity.Latitude = lat;
                    entity.Longitude = lng;
                }
            }

            _db.Addresses.Add(entity);
            await _db.SaveChangesAsync();

            return new AddressResponse
            {
                AddressId = entity.AddressId,
                RecipientName = entity.RecipientName,
                PhoneNumber = entity.PhoneNumber,
                Line1 = entity.Line1,
                Ward = entity.Ward,
                District = entity.District,
                Province = entity.Province,
                IsDefault = entity.IsDefault,
                Latitude = entity.Latitude,
                Longitude = entity.Longitude
            };
        }

        public async Task UpdateAsync(int userId, int addressId, AddressUpdateRequest req)
        {
            var entity = await _db.Addresses
                .FirstOrDefaultAsync(a => a.AddressId == addressId && a.UserId == userId);

            if (entity == null)
                throw new KeyNotFoundException("Address not found");

            if (req.IsDefault && !entity.IsDefault)
            {
                var prev = await _db.Addresses
                    .Where(a => a.UserId == userId && a.IsDefault)
                    .ToListAsync();

                foreach (var a in prev)
                    a.IsDefault = false;
            }

            entity.RecipientName = req.RecipientName;
            entity.PhoneNumber = req.PhoneNumber;
            entity.Line1 = req.Line1;
            entity.Ward = req.Ward;
            entity.District = req.District;
            entity.Province = req.Province;
            entity.IsDefault = req.IsDefault;

            if (req.Latitude.HasValue && req.Longitude.HasValue)
            {
                entity.Latitude = req.Latitude;
                entity.Longitude = req.Longitude;
            }

            entity.UpdateAt = DateTime.UtcNow;

            if (entity.Latitude == null || entity.Longitude == null)
            {
                var fullAddress =
                    $"{entity.Line1}, {entity.Ward}, {entity.District}, {entity.Province}, Việt Nam";
                _logger.LogInformation("AddressesService.UpdateAsync: geocoding {addr}", fullAddress);

                var (lat, lng) = await GeocodeAsync(fullAddress);
                if (lat.HasValue && lng.HasValue)
                {
                    entity.Latitude = lat;
                    entity.Longitude = lng;
                }
            }

            await _db.SaveChangesAsync();
        }

        public async Task SetDefaultAsync(int userId, int addressId)
        {
            var entity = await _db.Addresses
                .FirstOrDefaultAsync(a => a.AddressId == addressId && a.UserId == userId);

            if (entity == null)
                throw new KeyNotFoundException("Address not found");

            var prev = await _db.Addresses
                .Where(a => a.UserId == userId && a.IsDefault)
                .ToListAsync();

            foreach (var a in prev)
                a.IsDefault = false;

            entity.IsDefault = true;

            await _db.SaveChangesAsync();
        }

        public async Task DeleteAsync(int userId, int addressId)
        {
            var entity = await _db.Addresses
                .FirstOrDefaultAsync(a => a.AddressId == addressId && a.UserId == userId);

            if (entity == null)
                throw new KeyNotFoundException("Address not found");

            _db.Addresses.Remove(entity);
            await _db.SaveChangesAsync();
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

                var statusPropExists = root.TryGetProperty("status", out var statusProp);
                var status = statusPropExists ? statusProp.GetString() : null;
                _logger.LogInformation("GeocodeAsync: status = {status}", status);

                if (!string.Equals(status, "OK", StringComparison.OrdinalIgnoreCase))
                {
                    string? errorMessage = null;
                    if (root.TryGetProperty("error_message", out var errProp))
                    {
                        errorMessage = errProp.GetString();
                    }
                    _logger.LogWarning("GeocodeAsync: non-OK status {status}, error {err}", status, errorMessage);
                    return (null, null);
                }

                if (!root.TryGetProperty("results", out var results) || results.GetArrayLength() == 0)
                {
                    _logger.LogWarning("GeocodeAsync: no results for address");
                    return (null, null);
                }

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
    }
}
