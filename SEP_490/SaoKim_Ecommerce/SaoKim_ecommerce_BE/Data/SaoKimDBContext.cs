using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Entities;
using System.Data;

namespace SaoKim_ecommerce_BE.Data
{
    public class SaoKimDBContext : DbContext
    {
        public SaoKimDBContext(DbContextOptions<SaoKimDBContext> options) : base(options) { }

        public DbSet<Product> Products => Set<Product>();
        public DbSet<ReceivingSlip> ReceivingSlips => Set<ReceivingSlip>();
        public DbSet<ReceivingSlipItem> ReceivingSlipItems => Set<ReceivingSlipItem>();
        public DbSet<Role> Roles { get; set; }
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Product>(e =>
            {
                e.ToTable("products");
                e.HasKey(x => x.ProductID);
                e.Property(x => x.ProductName)
                    .HasMaxLength(200)
                    .IsRequired();
                e.Property(x => x.ProductCode)
                    .HasMaxLength(50)
                    .IsRequired();
                e.HasIndex(x => x.ProductCode)
                    .IsUnique();
                e.Property(x => x.Unit)
                    .HasMaxLength(50);
                e.Property(x => x.Description)
                    .HasMaxLength(500);
                e.Property(x => x.Supplier)
                    .HasMaxLength(200);
                e.Property(x => x.Image)
                    .HasMaxLength(300);
                e.Property(x => x.Price)
                    .HasColumnType("decimal(18,2)");
                e.Property(x => x.Note)
                    .HasMaxLength(500);
                e.Property(x => x.Category)
                    .HasMaxLength(100);
                e.Property(x => x.Status)
                    .HasMaxLength(50);
                e.Property(x => x.CreateAt)
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");
                e.Property(x => x.UpdateAt)
                    .IsRequired(false);
            });

            modelBuilder.Entity<ReceivingSlip>(e =>
            {
                e.ToTable("receiving_slips");
                e.HasKey(x => x.Id);
                e.Property(x => x.ReferenceNo).HasMaxLength(50).IsRequired();
                e.HasIndex(x => x.ReferenceNo).IsUnique();
                e.Property(x => x.Supplier).HasMaxLength(200).IsRequired();
                e.Property(x => x.Note).HasMaxLength(500);
            });

            modelBuilder.Entity<ReceivingSlipItem>(e =>
            {
                e.ToTable("receiving_slip_items");
                e.HasKey(x => x.Id);

                e.Property(x => x.ProductName).HasMaxLength(200).IsRequired();
                e.Property(x => x.Uom).HasMaxLength(50).IsRequired();
                e.Property(x => x.UnitPrice).HasColumnType("numeric(18,2)");
                e.Property(x => x.Total).HasColumnType("numeric(18,2)");

                e.HasOne(x => x.ReceivingSlip)
                 .WithMany(x => x.Items)
                 .HasForeignKey(x => x.ReceivingSlipId)
                 .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(x => x.Product)
                 .WithMany()
                 .HasForeignKey(x => x.ProductId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

        }
    }
}
