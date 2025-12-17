using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Helpers;

namespace SaoKim_ecommerce_BE.Services
{
    public class ShippingService : IShippingService
    {
        private readonly SaoKimDBContext _db;
        private readonly double _storeLat;
        private readonly double _storeLng;
        private readonly decimal _baseFee;
        private readonly double _freeDistanceKm;
        private readonly decimal _extraFeePerKm;

        public ShippingService(SaoKimDBContext db, IConfiguration config)
        {
            _db = db;

            _storeLat = config.GetValue<double>("ShippingFee:StoreLat");
            _storeLng = config.GetValue<double>("ShippingFee:StoreLng");
            _baseFee = config.GetValue<decimal>("ShippingFee:BaseFee");
            _freeDistanceKm = config.GetValue<double>("ShippingFee:FreeDistanceKm");
            _extraFeePerKm = config.GetValue<decimal>("ShippingFee:ExtraFeePerKm");
        }

        public async Task<ShippingFeeResultDto?> GetFeeAsync(int addressId, string method)
        {
            var address = await _db.Addresses
                .FirstOrDefaultAsync(a => a.AddressId == addressId);

            if (address == null)
                return null;

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
                    address.Latitude.Value, address.Longitude.Value);

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

            return new ShippingFeeResultDto
            {
                DistanceKm = Math.Round(distanceKm, 2),
                Fee = finalFee
            };
        }

        public async Task<ShippingDebugResultDto?> DebugAddressAsync(int addressId)
        {
            var address = await _db.Addresses
                .FirstOrDefaultAsync(a => a.AddressId == addressId);

            if (address == null)
                return null;

            double? distanceKm = null;
            if (address.Latitude.HasValue && address.Longitude.HasValue)
            {
                distanceKm = GeoHelper.DistanceInKm(
                    _storeLat, _storeLng,
                    address.Latitude.Value, address.Longitude.Value);
            }

            var fullAddress =
                $"{address.Line1}, {address.Ward}, {address.District}, {address.Province}";

            return new ShippingDebugResultDto
            {
                AddressId = address.AddressId,
                Address = fullAddress,
                Latitude = address.Latitude,
                Longitude = address.Longitude,
                DistanceKm = distanceKm
            };
        }
    }
}
