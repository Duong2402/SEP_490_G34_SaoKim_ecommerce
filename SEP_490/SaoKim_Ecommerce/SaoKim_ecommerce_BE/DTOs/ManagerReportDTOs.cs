using System;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class RevenueOverviewDto
    {
        public decimal TotalRevenue { get; set; }
        public decimal Revenue7d { get; set; }
        public int OrdersToday { get; set; }
        public int PendingOrders { get; set; }
    }

    public class WarehouseFlowSummaryDto
    {
        public int ThisWeek { get; set; }
        public int LastWeek { get; set; }
    }

    public class WarehouseOverviewDto
    {
        public int TotalStock { get; set; }
        public WarehouseFlowSummaryDto Inbound { get; set; } = new();
        public WarehouseFlowSummaryDto Outbound { get; set; } = new();
    }

    public class ProjectOverviewDto
    {
        public int TotalProjects { get; set; }
        public int DraftProjects { get; set; }
        public int ActiveProjects { get; set; }
        public int CompletedProjects { get; set; }

        public decimal TotalBudget { get; set; }
        public decimal TotalProductCost { get; set; }
        public decimal TotalOtherExpenses { get; set; }
        public decimal TotalActualCost { get; set; }
    }

    public class ManagerOverviewDto
    {
        public RevenueOverviewDto Revenue { get; set; } = new();
        public WarehouseOverviewDto Warehouse { get; set; } = new();
        public ProjectOverviewDto Projects { get; set; } = new();
    }

    public class RevenueByDayItemDto
    {
        public DateTime Date { get; set; }
        public decimal Revenue { get; set; }
    }
}
