// DTOs/ProjectReportDto.cs
using System;
using System.Collections.Generic;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class ProjectReportDto
    {
        // Project info
        public int ProjectId { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string CustomerName { get; set; }
        public string Status { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal Budget { get; set; }

        // Financials
        public decimal TotalProductAmount { get; set; }   // Sum(ProjectProducts.Total) ~ revenue-like
        public decimal TotalOtherExpenses { get; set; }   // Sum(ProjectExpenses.Amount)
        public decimal ActualAllIn { get; set; }          // = Product + Expenses
        public decimal Variance { get; set; }             // = Budget - ActualAllIn
        public decimal ProfitApprox { get; set; }         // ≈ Revenue - OtherExpenses (chưa có COGS riêng)

        // Progress & Issues
        public int TaskCount { get; set; }
        public int TaskCompleted { get; set; }
        public int TaskDelayed { get; set; }
        public int TaskActive { get; set; }
        public int ProgressPercent { get; set; }
        public List<string> Issues { get; set; } = new();
    }
}
