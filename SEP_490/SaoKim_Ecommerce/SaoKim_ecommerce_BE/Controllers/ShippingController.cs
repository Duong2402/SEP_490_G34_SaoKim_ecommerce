using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Helpers;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    public class ShippingController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        private readonly double _storeLat;
        private readonly double _storeLng;
        private readonly decimal _baseFee;
        private readonly double _freeDistanceKm;
        private readonly decimal _extraFeePerKm;

        public ShippingController(SaoKimDBContext db, IConfiguration config)
        {
            _db = db;
            _storeLat = config.GetValue<double>("Shipping:StoreLat");
            _storeLng = config.GetValue<double>("Shipping:StoreLng");
            _baseFee = config.GetValue<decimal>("Shipping:BaseFee");
            _freeDistanceKm = config.GetValue<double>("Shipping:FreeDistanceKm");
            _extraFeePerKm = config.GetValue<decimal>("Shipping:ExtraFeePerKm");
        }

        [HttpGet("fee")]
        public async Task<IActionResult> GetFee([FromQuery] int addressId, [FromQuery] string method = "standard")
        {
            var address = await _db.Addresses
                .FirstOrDefaultAsync(a => a.AddressId == addressId);

            if (address == null)
                return NotFound(new { message = "Không tìm thấy địa chỉ." });

            double distanceKm;
            decimal fee;

            if (address.Latitude == null || address.Longitude == null)
            {
                distanceKm = 0;
                fee = ShippingFeeCalculator.CalculateFee(
                    distanceKm, _baseFee, _freeDistanceKm, _extraFeePerKm);
            }
            else
            {
                distanceKm = GeoHelper.DistanceInKm(
                    _storeLat, _storeLng,
                    address.Latitude.Value, address.Longitude.Value
                );

                fee = ShippingFeeCalculator.CalculateFee(
                    distanceKm, _baseFee, _freeDistanceKm, _extraFeePerKm);
            }

            decimal multiplier = method switch
            {
                "fast" => 1.2m,
                "express" => 1.5m,
                _ => 1.0m
            };

            var finalFee = Math.Round(fee * multiplier, 0);

            return Ok(new
            {
                distanceKm = Math.Round(distanceKm, 2),
                fee = finalFee
            });
        }
        [HttpGet("debug/{addressId:int}")]
        public async Task<IActionResult> DebugAddress(int addressId)
        {
            var address = await _db.Addresses
                .FirstOrDefaultAsync(a => a.AddressId == addressId);

            if (address == null)
                return NotFound(new { message = "Không tìm thấy địa chỉ." });

            double? distanceKm = null;
            if (address.Latitude.HasValue && address.Longitude.HasValue)
            {
                distanceKm = GeoHelper.DistanceInKm(
                    _storeLat, _storeLng,
                    address.Latitude.Value, address.Longitude.Value
                );
            }

            return Ok(new
            {
                addressId = address.AddressId,
                address = $"{address.Line1}, {address.Ward}, {address.District}, {address.Province}",
                latitude = address.Latitude,
                longitude = address.Longitude,
                distanceKm
            });
        }
    }
}
