// Data/DbSeeder.cs
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(SaoKimDBContext db)
        {
            var roleSeeds = new List<Role>
            {
                new Role { RoleId = 1, Name = "admin" },
                new Role { RoleId = 2, Name = "warehouse_manager" },
                new Role { RoleId = 3, Name = "sales" },
                new Role { RoleId = 4, Name = "customer" },
                new Role { RoleId = 5, Name = "manager" },
                new Role { RoleId = 6, Name = "project_manager" }


            };

            foreach (var r in roleSeeds)
            {
                var exists = await db.Roles.AnyAsync(x => x.Name == r.Name);
                if (!exists)
                {
                    db.Roles.Add(r);
                }
            }
            await db.SaveChangesAsync();

            if (!db.Products.Any())
            {
                db.Products.AddRange(
                    new Product { ProductName = "Đèn Rạng Đông", ProductCode = "RĐ-01", Supplier = "Rạng Đông", Quantity = 0, Unit = "cái"},
                    new Product { ProductName = "Đèn Hừng Sáng", ProductCode = "HS-01", Supplier = "Hừng Sáng", Quantity = 0, Unit = "cái"}
                );
            }

            if (!db.ReceivingSlips.Any())
            {
                var slip = new ReceivingSlip
                {
                    ReferenceNo = "RCV-001",
                    Supplier = "Rạng Đông",
                    ReceiptDate = DateTime.UtcNow,
                    Status = ReceivingSlipStatus.Draft,
                    Note = "Seed"
                };
                db.ReceivingSlips.Add(slip);
                await db.SaveChangesAsync();

                db.ReceivingSlipItems.AddRange(
                    new ReceivingSlipItem
                    {
                        ReceivingSlipId = slip.Id,
                        ProductName = "Đèn Rạng Đông",
                        ProductId = db.Products.First().ProductID,
                        Uom = "cái",
                        Quantity = 10,
                        UnitPrice = 200000,
                        Total = 10 * 200000
                    },
                    new ReceivingSlipItem
                    {
                        ReceivingSlipId = slip.Id,
                        ProductName = "Đèn Hừng Sáng",
                        ProductId = db.Products.Skip(1).First().ProductID,
                        Uom = "cái",
                        Quantity = 5,
                        UnitPrice = 350000,
                        Total = 5 * 350000
                    }
                );
            }

            await db.SaveChangesAsync();
        }
    }
}
