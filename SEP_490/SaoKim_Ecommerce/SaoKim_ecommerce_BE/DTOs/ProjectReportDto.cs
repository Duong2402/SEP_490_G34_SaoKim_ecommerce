using System;
using System.Collections.Generic;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class ProjectReportDto
    {
        public int ProjectId { get; set; }
        public string Code { get; set; }
        public string Name { get; set; }
        public string CustomerName { get; set; }
        public string Status { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal Budget { get; set; }

        public decimal TotalProductAmount { get; set; }   
        public decimal TotalOtherExpenses { get; set; }  
        public decimal ActualAllIn { get; set; }          
        public decimal Variance { get; set; }             
        public decimal ProfitApprox { get; set; }         

        public int TaskCount { get; set; }
        public int TaskCompleted { get; set; }
        public int TaskDelayed { get; set; }
        public int TaskActive { get; set; }
        public int ProgressPercent { get; set; }
        public List<string> Issues { get; set; } = new();
    }
}
