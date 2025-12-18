namespace SaoKim_ecommerce_BE.DTOs
{
    public class DashboardAdminDTOs
    {
        public int TotalUsers { get; set; }
        public int NewUsersToday { get; set; }
        public int NewUsersThisMonth { get; set; }
        public int NewUsersLastMonth { get; set; }

        public List<MonthlyUserCount> Last6MonthsUsers { get; set; } = new();
    }

    public class MonthlyUserCount
    {
        public int Year { get; set; }
        public int Month { get; set; }   // 1..12
        public int Count { get; set; }
        public string Label { get; set; } = ""; // ví dụ "07/2025"
    }
}
