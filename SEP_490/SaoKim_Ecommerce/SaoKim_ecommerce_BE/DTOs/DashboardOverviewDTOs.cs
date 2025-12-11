namespace SaoKim_ecommerce_BE.DTOs
{
    public class DashboardOverviewDTOs
    {
        public decimal TotalRevenue { get; set; }
        public decimal Revenue7d { get; set; }
        public decimal RevenueToday { get; set; }
        public int OrdersToday { get; set; }
        public int PendingOrders { get; set; }
        public int ProductsCount { get; set; }
        public int CustomersCount { get; set; }
    }
}
