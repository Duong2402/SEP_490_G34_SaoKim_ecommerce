using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(SaoKimDBContext db)
        {
            // ---- ROLES (như bạn đã làm) ----
            var roleSeeds = new List<Role> {
        new Role { RoleId = 1, Name = "admin" },
        new Role { RoleId = 2, Name = "warehouse_manager" },
        new Role { RoleId = 3, Name = "sales" },
        new Role { RoleId = 4, Name = "customer" },
        new Role { RoleId = 5, Name = "manager" },
        new Role { RoleId = 6, Name = "project_manager" }
    };
            foreach (var r in roleSeeds)
                if (!await db.Roles.AnyAsync(x => x.Name == r.Name)) db.Roles.Add(r);
            await db.SaveChangesAsync();

            // ---- PRODUCTS: upsert theo ProductCode ----
            var seeds = new List<Product>
    {
        new() {
            ProductName = "Đèn Rạng Đông",
            ProductCode = "RD-01",              // ĐỔI để tránh unicode lạ trong code
            Supplier    = "Rạng Đông",
            Quantity    = 120,
            Unit        = "Cái",
            Price       = 120000m,
            Status      = "Active",
            Category    = "Đèn LED",
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
            Category    = "Đèn LED",
            Description = "Đèn LED Hừng Sáng siêu tiết kiệm",
            Image       = "https://via.placeholder.com/200x150?text=Den+Hung+Sang",
            CreateAt    = DateTime.UtcNow
        },
        new() {
            ProductName = "Đèn Sáng",
            ProductCode = "HS-02",              // KHÔNG trùng với HS-01 nữa
            Supplier    = "Sáng",
            Quantity    = 60,
            Unit        = "Cái",
            Price       = 110000m,
            Status      = "Active",
            Category    = "Đèn LED",
            Description = "Mẫu đèn khác để test",
            Image       = "https://via.placeholder.com/200x150?text=Den+Sang",
            CreateAt    = DateTime.UtcNow
        }
    };

            foreach (var s in seeds)
            {
                var exist = await db.Products.SingleOrDefaultAsync(x => x.ProductCode == s.ProductCode);
                if (exist == null)
                {
                    db.Products.Add(s);
                }
                else
                {
                    // cập nhật nếu đã tồn tại
                    exist.ProductName = s.ProductName;
                    exist.Supplier = s.Supplier;
                    exist.Quantity = s.Quantity;
                    exist.Unit = s.Unit;
                    exist.Price = s.Price;
                    exist.Status = s.Status;
                    exist.Category = s.Category;
                    exist.Description = s.Description;
                    exist.Image = s.Image;
                    exist.UpdateAt = DateTime.UtcNow;
                }
            }
            await db.SaveChangesAsync();

            // Lấy lại theo code để có ID chính xác cho phiếu nhập
            var rd = await db.Products.SingleAsync(p => p.ProductCode == "RD-01");
            var hs1 = await db.Products.SingleAsync(p => p.ProductCode == "HS-01");

            // ---- RECEIVING SLIPS (tạo nếu chưa có) ----
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

                var slip2 = new ReceivingSlip
                {
                    ReferenceNo = "RCV-002",
                    Supplier = "Điện Quang",
                    ReceiptDate = DateTime.UtcNow.AddDays(-2),
                    Status = ReceivingSlipStatus.Draft,
                    Note = "Seed 2"
                };
                db.ReceivingSlips.Add(slip2);
                await db.SaveChangesAsync();

                db.ReceivingSlipItems.AddRange(
                    new ReceivingSlipItem
                    {
                        ReceivingSlipId = slip2.Id,
                        ProductName = rd.ProductName,
                        ProductId = rd.ProductID,
                        Uom = "Cái",
                        Quantity = 15,
                        UnitPrice = 210000m,
                        Total = 15 * 210000m
                    },
                    new ReceivingSlipItem
                    {
                        ReceivingSlipId = slip2.Id,
                        ProductName = hs1.ProductName,
                        ProductId = hs1.ProductID,
                        Uom = "Cái",
                        Quantity = 8,
                        UnitPrice = 360000m,
                        Total = 8 * 360000m
                    }
                );

                await db.SaveChangesAsync();
            }
        }
    }
}
