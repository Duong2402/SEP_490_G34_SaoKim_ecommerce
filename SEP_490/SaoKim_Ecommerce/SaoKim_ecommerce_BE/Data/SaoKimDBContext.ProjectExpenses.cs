using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Data
{
    public partial class SaoKimDBContext : DbContext
    {
        // Chỉ cần khai báo DbSet, mapping lấy từ Data Annotations của entity
        public DbSet<ProjectExpense> ProjectExpenses => Set<ProjectExpense>();
    }
}
