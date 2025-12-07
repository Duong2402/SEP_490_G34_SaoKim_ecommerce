using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Data
{
    public partial class SaoKimDBContext : DbContext
    {
        public DbSet<ProjectProduct> ProjectProducts => Set<ProjectProduct>();
    }
}
