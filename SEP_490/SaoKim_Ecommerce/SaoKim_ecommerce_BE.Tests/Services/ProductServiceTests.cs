using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Xunit;

using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services;

namespace SaoKim_ecommerce_BE.Tests.Services
{
    public class ProductServiceTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new SaoKimDBContext(options);
        }

        private ProductService CreateService(SaoKimDBContext db)
        {
            return new ProductService(db);
        }

        private void SeedProducts(SaoKimDBContext db)
        {
            var now = DateTime.UtcNow;

            for (int i = 1; i <= 10; i++)
            {
                var p = new Product
                {
                    ProductName = $"Product {i}",
                    ProductDetails = new List<ProductDetail>
                    {
                        new ProductDetail
                        {
                            Price = 100 + i,
                            Quantity = 10 + i,
                            Status = "Active",
                            Image = $"/images/p{i}.jpg",
                            CreateAt = now.AddDays(-i)
                        }
                    }
                };
                db.Products.Add(p);
            }

            for (int i = 11; i <= 15; i++)
            {
                var p = new Product
                {
                    ProductName = $"ZeroStock {i}",
                    ProductDetails = new List<ProductDetail>
                    {
                        new ProductDetail
                        {
                            Price = 200 + i,
                            Quantity = 0,
                            Status = "Active",
                            Image = $"/images/zero{i}.jpg",
                            CreateAt = now.AddDays(-i)
                        }
                    }
                };
                db.Products.Add(p);
            }

            for (int i = 16; i <= 18; i++)
            {
                var p = new Product
                {
                    ProductName = $"Inactive {i}",
                    ProductDetails = new List<ProductDetail>
                    {
                        new ProductDetail
                        {
                            Price = 300 + i,
                            Quantity = 5,
                            Status = "Inactive",
                            Image = $"/images/inactive{i}.jpg",
                            CreateAt = now.AddDays(-i)
                        }
                    }
                };
                db.Products.Add(p);
            }

            db.SaveChanges();
        }

        [Fact]
        public async Task GetPagedAsync_Enforces_Page_And_PageSize_Bounds()
        {
            using var db = CreateDbContext();
            SeedProducts(db);

            var service = CreateService(db);

            var query = new ProductQueryParams
            {
                Page = 0,
                PageSize = 1000
            };

            var result = await service.GetPagedAsync(query);

            Assert.Equal(1, result.Page);
            Assert.True(result.PageSize <= 60);
            Assert.True(result.TotalItems > 0);
            Assert.NotEmpty(result.Items);
        }

        [Fact]
        public async Task GetPagedAsync_Filters_By_Keyword()
        {
            using var db = CreateDbContext();
            SeedProducts(db);

            db.Products.Add(new Product
            {
                ProductName = "Special Keyword Product",
                ProductDetails = new List<ProductDetail>
                {
                    new ProductDetail
                    {
                        Price = 999,
                        Quantity = 5,
                        Status = "Active",
                        CreateAt = DateTime.UtcNow
                    }
                }
            });
            db.SaveChanges();

            var service = CreateService(db);

            var query = new ProductQueryParams
            {
                Page = 1,
                PageSize = 50,
                Keyword = "Keyword"
            };

            var result = await service.GetPagedAsync(query);

            Assert.True(result.TotalItems >= 1);
            Assert.Contains(result.Items, x => x.Name.Contains("Keyword"));
        }

        [Fact]
        public async Task GetPagedAsync_Excludes_Inactive_Details()
        {
            using var db = CreateDbContext();
            SeedProducts(db);

            var service = CreateService(db);

            var query = new ProductQueryParams
            {
                Page = 1,
                PageSize = 100
            };

            var result = await service.GetPagedAsync(query);

            Assert.DoesNotContain(result.Items, x => x.Name.StartsWith("Inactive"));
        }

        [Fact]
        public async Task GetPagedAsync_Sorts_By_Price_Ascending()
        {
            using var db = CreateDbContext();
            SeedProducts(db);

            var service = CreateService(db);

            var query = new ProductQueryParams
            {
                Page = 1,
                PageSize = 50,
                SortBy = "price_asc"
            };

            var result = await service.GetPagedAsync(query);

            var prices = result.Items.Select(x => x.Price).ToList();
            var sorted = prices.OrderBy(x => x).ToList();

            Assert.Equal(sorted, prices);
        }

        [Fact]
        public async Task GetPagedAsync_Sorts_By_Price_Descending()
        {
            using var db = CreateDbContext();
            SeedProducts(db);

            var service = CreateService(db);

            var query = new ProductQueryParams
            {
                Page = 1,
                PageSize = 50,
                SortBy = "price_desc"
            };

            var result = await service.GetPagedAsync(query);

            var prices = result.Items.Select(x => x.Price).ToList();
            var sorted = prices.OrderByDescending(x => x).ToList();

            Assert.Equal(sorted, prices);
        }

        [Fact]
        public async Task GetPagedAsync_Default_Sorts_By_CreateAt_Descending()
        {
            using var db = CreateDbContext();
            SeedProducts(db);

            var service = CreateService(db);

            var query = new ProductQueryParams
            {
                Page = 1,
                PageSize = 50,
                SortBy = null
            };

            var result = await service.GetPagedAsync(query);

            var created = result.Items.Select(x => x.CreatedAt).ToList();
            var sorted = created.OrderByDescending(x => x).ToList();

            Assert.Equal(sorted, created);
        }

        [Fact]
        public async Task GetHomeAsync_Returns_Featured_Max_8_With_Positive_Stock()
        {
            using var db = CreateDbContext();
            SeedProducts(db);

            var service = CreateService(db);

            var query = new ProductQueryParams
            {
                Page = 1,
                PageSize = 12
            };

            var home = await service.GetHomeAsync(query);

            Assert.NotNull(home);
            Assert.NotNull(home.Featured);

            Assert.True(home.Featured.Count() <= 8);
            Assert.All(home.Featured, item => Assert.True(item.Stock > 0));
        }

        [Fact]
        public async Task GetHomeAsync_Returns_NewArrivals_Max_12()
        {
            using var db = CreateDbContext();
            SeedProducts(db);

            var service = CreateService(db);

            var query = new ProductQueryParams
            {
                Page = 1,
                PageSize = 20
            };

            var home = await service.GetHomeAsync(query);

            Assert.NotNull(home);
            Assert.NotNull(home.NewArrivals);
            Assert.True(home.NewArrivals.Count() <= 12);
        }

        [Fact]
        public async Task GetHomeAsync_Returns_All_From_GetPagedAsync()
        {
            using var db = CreateDbContext();
            SeedProducts(db);

            var service = CreateService(db);

            var query = new ProductQueryParams
            {
                Page = 2,
                PageSize = 5,
                SortBy = "price_asc",
                Keyword = "Product"
            };

            var home = await service.GetHomeAsync(query);

            Assert.NotNull(home);
            Assert.NotNull(home.All);
            Assert.Equal(2, home.All.Page);
            Assert.Equal(5, home.All.PageSize);
        }
    }
}
