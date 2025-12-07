using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models;
using System.Data;


namespace SaoKim_ecommerce_BE.Data
{
    public partial class SaoKimDBContext : DbContext
    {
        public SaoKimDBContext(DbContextOptions<SaoKimDBContext> options) : base(options) { }

        public DbSet<Product> Products => Set<Product>();
        public DbSet<ProductDetail> ProductDetails { get; set; }
        public DbSet<Category> Categories => Set<Category>();
        public DbSet<ReceivingSlip> ReceivingSlips => Set<ReceivingSlip>();
        public DbSet<ReceivingSlipItem> ReceivingSlipItems => Set<ReceivingSlipItem>();
        public DbSet<Role> Roles { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<Address> Addresses { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<CustomerNote> CustomerNotes { get; set; }
        public DbSet<StaffActionLog> StaffActionLogs { get; set; }
        public DbSet<Order> Orders => Set<Order>();
        public DbSet<OrderItem> OrderItems => Set<OrderItem>();
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<InvoiceItem> InvoiceItems { get; set; }
        public DbSet<TaskItem> TaskItems { get; set; }
        public DbSet<TaskDay> TaskDays { get; set; }
        public DbSet<DispatchBase> Dispatches { get; set; }
        public DbSet<DispatchItem> DispatchItems { get; set; }
        public DbSet<UnitOfMeasure> UnitOfMeasures { get; set; }
        public DbSet<InventoryThreshold> InventoryThresholds { get; set; } = default!;
        public DbSet<TraceIdentity> TraceIdentities { get; set; }
        public DbSet<TraceEvent> TraceEvents { get; set; }
        public DbSet<Promotion> Promotions => Set<Promotion>();
        public DbSet<PromotionProduct> PromotionProducts => Set<PromotionProduct>();
        public DbSet<Entities.Coupon> Coupons { get; set; } = default!;
        public DbSet<Banner> Banners { get; set; }



        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Role>(e =>
            {
                modelBuilder.Entity<User>()
                    .HasOne(u => u.Role)
                    .WithMany(r => r.Users)
                    .HasForeignKey(u => u.RoleId)
                    .OnDelete(DeleteBehavior.Restrict);

                modelBuilder.Entity<Category>(e =>
                {
                    e.ToTable("categories");
                    e.HasKey(x => x.Id);

                    e.Property(x => x.Name)
                        .HasMaxLength(100)
                        .IsRequired();

                    e.Property(x => x.Slug)
                        .HasMaxLength(120);

                    e.Property(x => x.Created)
                        .HasColumnName("created");

                    e.HasIndex(x => x.Name).HasDatabaseName("IX_categories_name");
                    e.HasIndex(x => x.Slug).HasDatabaseName("IX_categories_slug");
                });

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

                    e.HasMany(x => x.ProductDetails)
                        .WithOne(d => d.Product)
                        .HasForeignKey(d => d.ProductID)
                        .OnDelete(DeleteBehavior.Cascade);
                });

                modelBuilder.Entity<ProductDetail>(e =>
                {
                    e.ToTable("product_details");

                    e.HasKey(x => x.Id);

                    e.Property(x => x.Unit)
                        .HasMaxLength(50);

                    e.Property(x => x.Price)
                        .HasColumnType("decimal(18,2)");

                    e.Property(x => x.Status)
                        .HasMaxLength(50);

                    e.Property(x => x.Image)
                        .HasMaxLength(300);

                    e.Property(x => x.Description)
                        .HasMaxLength(500);

                    e.Property(x => x.Supplier)
                        .HasMaxLength(200);

                    e.Property(x => x.Note)
                        .HasMaxLength(500);

                    e.Property(x => x.CreateAt)
                        .HasDefaultValueSql("CURRENT_TIMESTAMP");

                    e.Property(x => x.UpdateAt)
                        .IsRequired(false);

                    e.Property(x => x.CategoryId)
                        .HasColumnName("category_id");

                    e.HasIndex(x => x.CategoryId)
                        .HasDatabaseName("IX_product_details_category_id");

                    e.HasOne(x => x.Category)
                        .WithMany(c => c.ProductDetails)
                        .HasForeignKey(x => x.CategoryId)
                        .OnDelete(DeleteBehavior.SetNull);
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

                modelBuilder.Entity<DispatchBase>(e =>
                {
                    e.ToTable("dispatch_list");

                    e.HasKey(x => x.Id);

                    e.Property(x => x.ReferenceNo)
                        .HasMaxLength(50)
                        .IsRequired();

                    e.HasIndex(x => x.ReferenceNo)
                        .IsUnique();

                    e.Property(x => x.DispatchDate)
                        .HasColumnName("dispatch_date")
                        .IsRequired();

                    e.Property(x => x.Note)
                        .HasMaxLength(500);

                    e.Property(x => x.Status)
                        .HasColumnName("status")
                        .HasConversion<int>()
                        .IsRequired();

                    e.Property(x => x.CreatedAt)
                        .HasColumnName("created_at")
                        .HasDefaultValueSql("NOW()")
                        .IsRequired();

                    e.Property(x => x.ConfirmedAt)
                        .HasColumnName("confirmed_at");

                    e.HasMany(x => x.Items)
                        .WithOne(i => i.Dispatch)
                        .HasForeignKey(i => i.DispatchId)
                        .OnDelete(DeleteBehavior.Cascade);
                });

                modelBuilder.Entity<RetailDispatch>(e =>
                {
                    e.ToTable("dispatch_retail_list");

                    e.Property(x => x.CustomerName)
                        .HasMaxLength(200)
                        .IsRequired();

                    e.Property(x => x.CustomerId)
                        .HasColumnName("customer_id");
                });

                modelBuilder.Entity<ProjectDispatch>(e =>
                {
                    e.ToTable("dispatch_project_list");

                    e.Property(x => x.ProjectName)
                        .HasMaxLength(200)
                        .IsRequired();

                    e.Property(x => x.ProjectId)
                        .HasColumnName("project_id");
                });

                modelBuilder.Entity<DispatchItem>(e =>
                {
                    e.ToTable("dispatch_item");

                    e.HasKey(x => x.Id);

                    e.Property(x => x.DispatchId)
                        .HasColumnName("dispatch_id")
                        .IsRequired();

                    e.Property(x => x.ProductName)
                        .HasMaxLength(200)
                        .IsRequired();

                    e.Property(x => x.Uom)
                        .HasMaxLength(50)
                        .HasDefaultValue("pcs");

                    e.Property(x => x.Quantity)
                        .HasPrecision(18, 3)
                        .IsRequired();

                    e.Property(x => x.UnitPrice)
                        .HasPrecision(18, 2)
                        .IsRequired();

                    e.Property(x => x.Total)
                        .HasColumnType("numeric(18,2)")
                        .IsRequired();

                    e.HasOne(x => x.Dispatch)
                        .WithMany(x => x.Items)
                        .HasForeignKey(x => x.DispatchId)
                        .OnDelete(DeleteBehavior.Cascade);
                });

                modelBuilder.Entity<Project>(e =>
                {
                    e.HasIndex(p => p.Code).IsUnique();

                    e.Property(p => p.Budget).HasColumnType("decimal(18,2)");
                    e.Property(p => p.Status).HasDefaultValue("Draft");

                    e.Property(p => p.StartDate).HasColumnType("date");
                    e.Property(p => p.EndDate).HasColumnType("date");

                    e.HasOne(p => p.ProjectManager)
                     .WithMany(u => u.ManagedProjects)
                     .HasForeignKey(p => p.ProjectManagerId)
                     .OnDelete(DeleteBehavior.Restrict);
                });


                modelBuilder.Entity<TaskItem>(e =>
                {
                    e.ToTable("project_tasks");
                    e.HasKey(t => t.Id);
                    e.Property(t => t.Name).HasMaxLength(200).IsRequired();
                    e.Property(t => t.Assignee).HasMaxLength(150);

                    e.Property(t => t.StartDate).HasColumnType("date");

                    e.HasOne(t => t.Project)
                     .WithMany(p => p.Tasks)
                     .HasForeignKey(t => t.ProjectId)
                     .OnDelete(DeleteBehavior.Cascade);

                    e.HasOne(t => t.DependsOn)
                     .WithMany()
                     .HasForeignKey(t => t.DependsOnTaskId)
                     .OnDelete(DeleteBehavior.NoAction);
                });

                modelBuilder.Entity<TaskDay>(e =>
                {
                    e.ToTable("project_task_days");
                    e.HasKey(d => d.Id);

                    e.Property(d => d.Date).IsRequired().HasColumnType("date");

                    e.HasOne(d => d.TaskItem)
                     .WithMany(t => t.Days)
                     .HasForeignKey(d => d.TaskItemId)
                     .OnDelete(DeleteBehavior.Cascade);

                    e.HasIndex(d => new { d.TaskItemId, d.Date }).IsUnique();
                });

                base.OnModelCreating(modelBuilder);
                modelBuilder.Entity<Invoice>(e =>
                {
                    e.ToTable("invoices");
                    e.HasKey(x => x.Id);
                    e.Property(x => x.Code).HasMaxLength(40).IsRequired();
                    e.HasIndex(x => x.Code).IsUnique();

                    e.Property(x => x.CustomerId).HasColumnName("customer_id");
                    e.Property(x => x.CustomerName).HasMaxLength(200);
                    e.Property(x => x.Email).HasMaxLength(200);
                    e.Property(x => x.Phone).HasMaxLength(50);

                    e.Property(x => x.OrderId).HasColumnName("order_id");

                    e.Property(x => x.CreatedAt).HasDefaultValueSql("NOW()");

                    e.Property(x => x.Subtotal).HasColumnType("numeric(18,2)");
                    e.Property(x => x.Discount).HasColumnType("numeric(18,2)");
                    e.Property(x => x.Tax).HasColumnType("numeric(18,2)");
                    e.Property(x => x.Total).HasColumnType("numeric(18,2)");

                    e.Property(x => x.PdfFileName).HasMaxLength(260);
                    e.Property(x => x.PdfOriginalName).HasMaxLength(260);

                    e.HasOne(x => x.Customer)
                     .WithMany(u => u.Invoices)
                     .HasForeignKey(x => x.CustomerId)
                     .OnDelete(DeleteBehavior.Restrict);

                    e.HasOne(x => x.Order)
                     .WithOne(o => o.Invoice)
                     .HasForeignKey<Invoice>(x => x.OrderId)
                     .OnDelete(DeleteBehavior.Cascade);
                });



                modelBuilder.Entity<InvoiceItem>(e =>
                {
                    e.ToTable("invoice_items");
                    e.HasKey(x => x.Id);

                    e.Property(x => x.ProductName).HasMaxLength(200).IsRequired();
                    e.Property(x => x.Uom).HasMaxLength(50);
                    e.Property(x => x.Quantity).HasPrecision(18, 3);
                    e.Property(x => x.UnitPrice).HasPrecision(18, 2);
                    e.Property(x => x.LineTotal).HasColumnType("numeric(18,2)");

                    e.HasOne(x => x.Invoice)
                     .WithMany(i => i.Items)
                     .HasForeignKey(x => x.InvoiceId)
                     .OnDelete(DeleteBehavior.Cascade);
                });


                modelBuilder.Entity<CustomerNote>()
                    .HasOne(n => n.Customer)
                    .WithMany(u => u.Notes)
                    .HasForeignKey(n => n.CustomerId)
                    .OnDelete(DeleteBehavior.Restrict);

                modelBuilder.Entity<CustomerNote>()
                    .HasOne(n => n.Staff)
                    .WithMany()
                    .HasForeignKey(n => n.StaffId)
                    .OnDelete(DeleteBehavior.Restrict);

                modelBuilder.Entity<StaffActionLog>()
                    .HasOne(l => l.Staff)
                    .WithMany()
                    .HasForeignKey(l => l.StaffId)
                    .OnDelete(DeleteBehavior.Restrict);

                modelBuilder.Entity<Address>(e =>
                {
                    e.ToTable("user_addresses");
                    e.HasKey(a => a.AddressId);

                    e.HasOne(a => a.User)
                     .WithMany()
                     .HasForeignKey(a => a.UserId)
                     .OnDelete(DeleteBehavior.Cascade);

                    e.Property(a => a.Line1).HasMaxLength(200).IsRequired();
                    e.Property(a => a.Ward).HasMaxLength(100);
                    e.Property(a => a.District).HasMaxLength(100);
                    e.Property(a => a.Province).HasMaxLength(100);

                    e.HasIndex(a => new { a.UserId, a.IsDefault });
                });

                modelBuilder.Entity<Review>(e =>
                {
                    e.ToTable("product_reviews");
                    e.HasKey(r => r.ReviewID);
                    e.Property(r => r.Comment).HasMaxLength(1000);
                    e.Property(r => r.Rating).IsRequired();
                    e.Property(r => r.CreatedAt).HasColumnName("created_at");

                    e.HasOne(r => r.Product)
                        .WithMany()
                        .HasForeignKey(r => r.ProductID)
                        .OnDelete(DeleteBehavior.Cascade);

                    e.HasOne(r => r.User)
                        .WithMany()
                        .HasForeignKey(r => r.UserID)
                        .OnDelete(DeleteBehavior.Cascade);

                    e.HasIndex(r => r.ProductID);
                    e.HasIndex(r => new { r.ProductID, r.UserID }).IsUnique();
                });
                modelBuilder.Entity<TraceIdentity>()
                    .HasIndex(x => x.IdentityCode)
                    .IsUnique();

                modelBuilder.Entity<TraceIdentity>()
                    .HasOne(x => x.Product)
                    .WithMany()
                    .HasForeignKey(x => x.ProductId)
                    .OnDelete(DeleteBehavior.Restrict);

                modelBuilder.Entity<TraceEvent>()
                    .HasOne(e => e.TraceIdentity)
                    .WithMany(i => i.Events)
                    .HasForeignKey(e => e.TraceIdentityId)
                    .OnDelete(DeleteBehavior.Cascade);

                modelBuilder.Entity<Promotion>(e =>
                {
                    e.ToTable("promotions");
                    e.HasKey(x => x.Id);

                    e.Property(x => x.Name).IsRequired().HasMaxLength(200);
                    e.Property(x => x.Description).HasMaxLength(500);

                    e.Property(x => x.ImageUrl).HasMaxLength(500);
                    e.Property(x => x.LinkUrl).HasMaxLength(500);
                    e.Property(x => x.DescriptionHtml).HasColumnType("text");

                    e.Property(x => x.DiscountType).HasConversion<string>().HasMaxLength(20);
                    e.Property(x => x.DiscountValue).HasColumnType("numeric(18, 2)");

                    e.Property(x => x.StartDate).HasColumnType("timestamp with time zone");
                    e.Property(x => x.EndDate).HasColumnType("timestamp with time zone");

                    e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);

                    e.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
                    e.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");

                    e.HasIndex(x => x.Status);
                    e.HasIndex(x => new { x.StartDate, x.EndDate });
                });

                modelBuilder.Entity<PromotionProduct>(e =>
                {
                    e.ToTable("promotion_products");
                    e.HasKey(x => x.Id);

                    e.Property(x => x.Note).HasMaxLength(500);

                    e.HasOne(x => x.Promotion)
                        .WithMany(p => p.PromotionProducts)
                        .HasForeignKey(x => x.PromotionId)
                        .OnDelete(DeleteBehavior.Cascade);

                    e.HasOne(x => x.Product)
                        .WithMany()
                        .HasForeignKey(x => x.ProductId)
                        .OnDelete(DeleteBehavior.Restrict);

                    e.HasIndex(x => new { x.PromotionId, x.ProductId }).IsUnique();
                });

                modelBuilder.Entity<Entities.Coupon>(b =>
                {
                    b.ToTable("Coupons");
                    b.HasKey(x => x.Id);
                    b.Property(x => x.Code).IsRequired().HasMaxLength(64);
                    b.HasIndex(x => x.Code).IsUnique();
                    b.Property(x => x.Name).IsRequired().HasMaxLength(200);
                    b.Property(x => x.DiscountType).IsRequired().HasMaxLength(32);
                    b.Property(x => x.DiscountValue).HasColumnType("numeric(18,2)");
                    b.Property(x => x.MinOrderAmount).HasColumnType("numeric(18,2)");
                    b.Property(x => x.Status).IsRequired().HasMaxLength(32);
                });
                modelBuilder.Entity<Banner>(b =>
                {
                    b.Property(x => x.Title).IsRequired().HasMaxLength(255);
                    b.Property(x => x.ImageUrl).IsRequired().HasMaxLength(2000);

                    b.Property(x => x.LinkUrl).HasMaxLength(500);

                    b.Property(x => x.CreatedAt)
                     .HasDefaultValueSql("CURRENT_TIMESTAMP AT TIME ZONE 'UTC'");
                });


            });
        }
    }
}