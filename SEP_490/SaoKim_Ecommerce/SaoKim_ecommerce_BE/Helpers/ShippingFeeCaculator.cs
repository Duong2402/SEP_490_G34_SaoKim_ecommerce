namespace SaoKim_ecommerce_BE.Helpers
{
    public static class ShippingFeeCalculator
    {
        public static decimal CalculateFee(
            double distanceKm,
            decimal baseFee,
            double freeDistanceKm,
            decimal extraFeePerKm)
        {
            if (distanceKm <= 0)
                return baseFee;

            var d = Math.Ceiling(distanceKm);

            if (d <= freeDistanceKm)
                return baseFee;

            var extraKm = d - freeDistanceKm;
            var extra = (decimal)extraKm * extraFeePerKm;

            return baseFee + extra;
        }
    }
}
