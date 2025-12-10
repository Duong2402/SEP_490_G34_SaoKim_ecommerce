using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Entities;
using System.Text;
using System.Security.Cryptography;

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

            // ----- Seed Categories -----
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

            var catDenLed = await db.Categories.Where(c => c.Name == "Đèn LED").Select(c => c.Id).FirstAsync();


            if (!await db.Users.AnyAsync())
            {
                var users = new List<User>
                {
                    new User
                    {
                        Name = "Admin User",
                        Email = "admin@saokim.vn",
                        Password = HashPassword("123456789"),
                        RoleId = 1,
                        PhoneNumber = "0900000001",
                        Status = "Active",
                        Address = "Hà Nội, Việt Nam",
                        CreateBy = "Seeder"
                    },
                    new User
                    {
                        Name = "Warehouse Manager",
                        Email = "warehousemanager@saokim.vn",
                        Password = HashPassword("123456789"),
                        RoleId = 2,
                        PhoneNumber = "0900000002",
                        Status = "Active",
                        Address = "Hà Nội, Việt Nam",
                        CreateBy = "Seeder"
                    },
                    new User
                    {
                        Name = "Staff User",
                        Email = "staff@saokim.vn",
                        Password = HashPassword("123456789"),
                        RoleId = 3,
                        PhoneNumber = "0900000003",
                        Status = "Active",
                        Address = "Đà Nẵng, Việt Nam",
                        CreateBy = "Seeder"
                    },
                    new User
                    {
                        Name = "Project Manager",
                        Email = "projectmanager@saokim.vn",
                        Password = HashPassword("123456789"),
                        RoleId = 6,
                        PhoneNumber = "0900000004",
                        Status = "Active",
                        Address = "TP. Hồ Chí Minh, Việt Nam",
                        CreateBy = "Seeder"
                    },
                    new User
                    {
                        Name = "Manager User",
                        Email = "manager@saokim.vn",
                        Password = HashPassword("123456789"),
                        RoleId = 5,
                        PhoneNumber = "0900000005",
                        Status = "Active",
                        Address = "Hà Nội, Việt Nam",
                        CreateBy = "Seeder"
                    }
                };

                await db.Users.AddRangeAsync(users);
                await db.SaveChangesAsync();
            }

            var uomSeeds = new List<UnitOfMeasure>
            {
                new UnitOfMeasure { Name = "Bộ", Status = "Active" },
                new UnitOfMeasure { Name = "Cái", Status = "Active" },
                new UnitOfMeasure { Name = "Chùm", Status = "Active" },
                new UnitOfMeasure { Name = "Bóng", Status = "Active" },
                new UnitOfMeasure { Name = "Bộ phận", Status = "Active" },
                new UnitOfMeasure { Name = "Chiếc", Status = "Active" }
            };
            foreach (var u in uomSeeds)
                if (!await db.UnitOfMeasures.AnyAsync(x => x.Name == u.Name)) db.UnitOfMeasures.Add(u);
            await db.SaveChangesAsync();
        }

        private static string Slugify(string input)
        {
            var s = input.Trim().ToLower();
            s = System.Text.RegularExpressions.Regex.Replace(s, @"\s+", "-");
            s = System.Text.RegularExpressions.Regex.Replace(s, @"[^a-z0-9\-]", "");
            return s;
        }
        private static string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }

    }
}
