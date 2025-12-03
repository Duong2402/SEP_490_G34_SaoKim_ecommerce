namespace SaoKim_ecommerce_BE.Helpers
{
    public static class ShippingFeeCalculator
    {
        public static decimal CalculateFee(double distanceKm)
        {
            if (distanceKm <= 3)
                return 20000m;

            if (distanceKm <= 10)
                return 25000m;

            if (distanceKm <= 30)
                return 30000m;

            decimal extraKm = (decimal)(distanceKm - 30);
            return 30000m + extraKm * 500m;
        }
    }
}
