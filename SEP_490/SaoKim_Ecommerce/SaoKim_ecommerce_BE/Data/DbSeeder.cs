using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(SaoKimDBContext db)
        {
            // ----- Seed Roles -----
            var roleSeeds = new List<Role> {
                new Role { RoleId = 1, Name = "admin" },
                new Role { RoleId = 2, Name = "warehouse_manager" },
                new Role { RoleId = 3, Name = "staff" },
                new Role { RoleId = 4, Name = "customer" },
                new Role { RoleId = 5, Name = "manager" },
                new Role { RoleId = 6, Name = "project_manager" }
            };
            foreach (var r in roleSeeds)
                if (!await db.Roles.AnyAsync(x => x.Name == r.Name)) db.Roles.Add(r);
            await db.SaveChangesAsync();

            // ----- Seed Categories (nếu chưa có) -----
            var catNames = new[] { "Đèn LED" };
            foreach (var name in catNames)
            {
                if (!await db.Categories.AnyAsync(c => c.Name.ToLower() == name.ToLower()))
                {
                    db.Categories.Add(new Category
                    {
                        Name = name,
                        Slug = Slugify(name),
                        Created = DateTime.UtcNow
                    });
                }
            }
            await db.SaveChangesAsync();

            if (!await db.Set<Invoice>().AnyAsync())
            {
                var inv = new Invoice
                {
                    Code = $"INV-{DateTime.UtcNow:yyyyMMdd}-001",
                    CustomerName = "Tập đoàn FPT",
                    Email = "contact@fpt.com",
                    Phone = "024 7300 5588",
                    Subtotal = 1_000_000,
                    Discount = 0,
                    Tax = 100_000,
                    Total = 1_100_000,
                    Status = InvoiceStatus.Paid,
                    Items = new List<InvoiceItem>
        {
            new InvoiceItem { ProductName = "Đèn LED 10W", Quantity = 10, UnitPrice = 50_000, LineTotal = 500_000, Uom = "cái" },
            new InvoiceItem { ProductName = "Đèn rọi 7W", Quantity =  5, UnitPrice =100_000, LineTotal = 500_000, Uom = "cái" }
        }
                };
                db.Add(inv);
                await db.SaveChangesAsync();
            }




            // Lấy id danh mục cần dùng
            var catDenLed = await db.Categories.Where(c => c.Name == "Đèn LED").Select(c => c.Id).FirstAsync();

            // ----- Seed Products -----
            var seeds = new List<Product>
            {
                new() {
                    ProductName = "Đèn Rạng Đông",
                    ProductCode = "RD-01",
                    Supplier    = "Rạng Đông",
                    Quantity    = 120,
                    Unit        = "Cái",
                    Price       = 120000m,
                    Status      = "Active",
                    CategoryId  = catDenLed,                    //  dùng FK
                    Description = "Đèn LED Rạng Đông công suất 12W",
                    Image       = "https://via.placeholder.com/200x150?text=Den+Rang+Dong",
                    CreateAt    = DateTime.UtcNow
                },
                new() {
                    ProductName = "Đèn Hừng Sáng",
                    ProductCode = "HS-01",
                    Supplier    = "Hừng Sáng",
                    Quantity    = 85,
                    Unit        = "Cái",
                    Price       = 95000m,
                    Status      = "Active",
                    CategoryId  = catDenLed,                    // 
                    Description = "Đèn LED Hừng Sáng siêu tiết kiệm",
                    Image       = "https://via.placeholder.com/200x150?text=Den+Hung+Sang",
                    CreateAt    = DateTime.UtcNow
                },
                new() {
                    ProductName = "Đèn Sáng",
                    ProductCode = "HS-02",
                    Supplier    = "Sáng",
                    Quantity    = 60,
                    Unit        = "Cái",
                    Price       = 110000m,
                    Status      = "Active",
                    CategoryId  = catDenLed,                    // 
                    Description = "Mẫu đèn khác để test",
                    Image       = "https://via.placeholder.com/200x150?text=Den+Sang",
                    CreateAt    = DateTime.UtcNow
                }
            };

            foreach (var s in seeds)
            {
                var exist = await db.Products.SingleOrDefaultAsync(x => x.ProductCode == s.ProductCode);
                if (exist == null)
                    db.Products.Add(s);
                else
                {
                    exist.ProductName = s.ProductName;
                    exist.Supplier = s.Supplier;
                    exist.Quantity = s.Quantity;
                    exist.Unit = s.Unit;
                    exist.Price = s.Price;
                    exist.Status = s.Status;
                    exist.CategoryId = s.CategoryId;          //  cập nhật FK
                    exist.Description = s.Description;
                    exist.Image = s.Image;
                    exist.UpdateAt = DateTime.UtcNow;
                }
            }
            await db.SaveChangesAsync();

            var rd = await db.Products.SingleAsync(p => p.ProductCode == "RD-01");
            var hs1 = await db.Products.SingleAsync(p => p.ProductCode == "HS-01");

            if (!await db.ReceivingSlips.AnyAsync())
            {
                var slip1 = new ReceivingSlip
                {
                    ReferenceNo = "RCV-001",
                    Supplier = "Rạng Đông",
                    ReceiptDate = DateTime.UtcNow,
                    Status = ReceivingSlipStatus.Draft,
                    Note = "Seed 1"
                };
                db.ReceivingSlips.Add(slip1);
                await db.SaveChangesAsync();

                db.ReceivingSlipItems.AddRange(
                    new ReceivingSlipItem
                    {
                        ReceivingSlipId = slip1.Id,
                        ProductName = rd.ProductName,
                        ProductId = rd.ProductID,
                        Uom = "Cái",
                        Quantity = 10,
                        UnitPrice = 200000m,
                        Total = 10 * 200000m
                    },
                    new ReceivingSlipItem
                    {
                        ReceivingSlipId = slip1.Id,
                        ProductName = hs1.ProductName,
                        ProductId = hs1.ProductID,
                        Uom = "Cái",
                        Quantity = 5,
                        UnitPrice = 350000m,
                        Total = 5 * 350000m
                    }
                );
                await db.SaveChangesAsync();
            }

            await SeedDispatchesAsync(db);
        }

        private static string Slugify(string input)
        {
            var s = input.Trim().ToLower();
            s = System.Text.RegularExpressions.Regex.Replace(s, @"\s+", "-");
            s = System.Text.RegularExpressions.Regex.Replace(s, @"[^a-z0-9\-]", "");
            return s;
        }

        public static async Task SeedDispatchesAsync(SaoKimDBContext db)
        {
            if (await db.Dispatches.AnyAsync())
                return;

            var retail1 = new RetailDispatch
            {
                ReferenceNo = "R-001",
                CustomerName = "Khách hàng A",
                CustomerId = 101,
                DispatchDate = DateTime.UtcNow.AddDays(-3),
                Status = DispatchStatus.Draft,
                Note = "Phiếu bán lẻ A",
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            };

            var retail2 = new RetailDispatch
            {
                ReferenceNo = "R-002",
                CustomerName = "Khách hàng B",
                CustomerId = 102,
                DispatchDate = DateTime.UtcNow.AddDays(-2),
                Status = DispatchStatus.Confirmed,
                ConfirmedAt = DateTime.UtcNow.AddDays(-1),
                Note = "Phiếu bán lẻ B",
                CreatedAt = DateTime.UtcNow.AddDays(-4)
            };

            var project1 = new ProjectDispatch
            {
                ReferenceNo = "P-001",
                ProjectName = "Dự án X",
                ProjectId = 201,
                DispatchDate = DateTime.UtcNow.AddDays(-1),
                Status = DispatchStatus.Draft,
                Note = "Phiếu dự án X",
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            };

            var project2 = new ProjectDispatch
            {
                ReferenceNo = "P-002",
                ProjectName = "Dự án Y",
                ProjectId = 202,
                DispatchDate = DateTime.UtcNow,
                Status = DispatchStatus.Confirmed,
                ConfirmedAt = DateTime.UtcNow,
                Note = "Phiếu dự án Y",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            };
            await db.Dispatches.AddRangeAsync(retail1, retail2, project1, project2);
            await db.SaveChangesAsync();
        }
    }
}
