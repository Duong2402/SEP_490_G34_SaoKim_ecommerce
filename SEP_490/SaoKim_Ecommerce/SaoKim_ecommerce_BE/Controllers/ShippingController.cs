using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Helpers;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ShippingController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        private readonly double _storeLat;
        private readonly double _storeLng;

        public ShippingController(SaoKimDBContext db, IConfiguration config)
        {
            _db = db;
            _storeLat = config.GetValue<double>("Shipping:StoreLat");
            _storeLng = config.GetValue<double>("Shipping:StoreLng");
        }

        // GET /api/shipping/fee?addressId=123
        [HttpGet("fee")]
        public async Task<IActionResult> GetFee([FromQuery] int addressId)
        {
            var address = await _db.Addresses
                .FirstOrDefaultAsync(a => a.AddressId == addressId);

            if (address == null)
                return NotFound(new { message = "Không tìm thấy địa chỉ." });

            double distanceKm;
            decimal fee;

            // Nếu chưa có tọa độ: fallback phí ship mặc định
            if (address.Latitude == null || address.Longitude == null)
            {
                distanceKm = 0;
                fee = ShippingFeeCalculator.CalculateFee(distanceKm);
            }
            else
            {
                distanceKm = GeoHelper.DistanceInKm(
                    _storeLat, _storeLng,
                    address.Latitude.Value, address.Longitude.Value
                );

                fee = ShippingFeeCalculator.CalculateFee(distanceKm);
            }

            return Ok(new
            {
                distanceKm = Math.Round(distanceKm, 2),
                fee
            });
        }
    }
}
