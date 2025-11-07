using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Data
{
    public partial class SaoKimDBContext : DbContext
    {
        public DbSet<ProjectProduct> ProjectProducts => Set<ProjectProduct>();
        // Không override OnModelCreating ở đây để tránh xung đột;
        // cấu hình sẽ theo DataAnnotation trong Entity (table name, precision, v.v.)
    }
}
