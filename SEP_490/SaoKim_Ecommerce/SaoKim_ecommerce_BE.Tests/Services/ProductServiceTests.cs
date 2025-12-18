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

        #region Additional tests for ProductService

        [Fact]
        public async Task GetPagedAsync_Clamps_PageSize_To_Min_1()
        {
            using var db = CreateDbContext();
            SeedProducts(db);
            var service = CreateService(db);

            var q = new ProductQueryParams { Page = 1, PageSize = 0 };
            var res = await service.GetPagedAsync(q);

            Assert.Equal(1, res.PageSize);
            Assert.True(res.Items.Count() <= 1);

        }

        [Fact]
        public async Task GetPagedAsync_Trims_Keyword()
        {
            using var db = CreateDbContext();
            SeedProducts(db);

            db.Products.Add(new Product
            {
                ProductName = "Trim Me",
                ProductCode = "TRIM01",
                ProductDetails = new List<ProductDetail>
        {
            new ProductDetail { Price = 111, Quantity = 1, Status = "Active", CreateAt = DateTime.UtcNow }
        }
            });
            db.SaveChanges();

            var service = CreateService(db);

            var q = new ProductQueryParams { Page = 1, PageSize = 50, Keyword = "   Trim   " };
            var res = await service.GetPagedAsync(q);

            Assert.Contains(res.Items, x => x.Name == "Trim Me");
        }

        [Fact]
        public async Task GetPagedAsync_Uses_Latest_Detail_By_Id()
        {
            using var db = CreateDbContext();

            var p = new Product
            {
                ProductName = "MultiDetail",
                ProductCode = "MD01",
                ProductDetails = new List<ProductDetail>
        {
            new ProductDetail { Price = 100, Quantity = 1, Status = "Active", CreateAt = DateTime.UtcNow.AddDays(-2) },
            new ProductDetail { Price = 200, Quantity = 2, Status = "Active", CreateAt = DateTime.UtcNow.AddDays(-1) }
        }
            };
            db.Products.Add(p);
            db.SaveChanges();

            var service = CreateService(db);

            var res = await service.GetPagedAsync(new ProductQueryParams
            {
                Page = 1,
                PageSize = 10,
                Keyword = "MultiDetail"
            });

            var item = Assert.Single(res.Items);
            Assert.Equal(200, item.Price);
            Assert.Equal(2, item.Stock);
        }


        [Fact]
        public async Task GetPagedAsync_Excludes_Product_When_Latest_Detail_Inactive_Even_If_Older_Active()
        {
            using var db = CreateDbContext();

            var p = new Product
            {
                ProductName = "LatestInactive",
                ProductCode = "LI01",
                ProductDetails = new List<ProductDetail>
        {
            new ProductDetail { Price = 100, Quantity = 5, Status = "Active", CreateAt = DateTime.UtcNow.AddDays(-2) },
            new ProductDetail { Price = 200, Quantity = 5, Status = "Inactive", CreateAt = DateTime.UtcNow.AddDays(-1) }
        }
            };
            db.Products.Add(p);
            db.SaveChanges();

            var service = CreateService(db);

            var res = await service.GetPagedAsync(new ProductQueryParams { Page = 1, PageSize = 50, Keyword = "LatestInactive" });

            Assert.Empty(res.Items);
            Assert.Equal(0, res.TotalItems);
        }

        [Fact]
        public async Task GetPagedAsync_Includes_Product_When_Latest_Detail_Status_Null()
        {
            using var db = CreateDbContext();

            db.Products.Add(new Product
            {
                ProductName = "NullStatus",
                ProductCode = "NS01",
                ProductDetails = new List<ProductDetail>
        {
            new ProductDetail { Price = 123, Quantity = 7, Status = null, CreateAt = DateTime.UtcNow }
        }
            });
            db.SaveChanges();

            var service = CreateService(db);

            var res = await service.GetPagedAsync(new ProductQueryParams
            {
                Page = 1,
                PageSize = 20,
                Keyword = "NullStatus"
            });

            var item = Assert.Single(res.Items);
            Assert.Equal(123, item.Price);
        }

        [Fact]
        public async Task GetPagedAsync_Excludes_Product_When_No_Detail()
        {
            using var db = CreateDbContext();

            db.Products.Add(new Product
            {
                ProductName = "NoDetail",
                ProductCode = "ND01",
                ProductDetails = new List<ProductDetail>() // không có detail
            });
            db.SaveChanges();

            var service = CreateService(db);

            var res = await service.GetPagedAsync(new ProductQueryParams { Page = 1, PageSize = 50, Keyword = "NoDetail" });

            Assert.Empty(res.Items);
        }

        [Fact]
        public async Task GetPagedAsync_Returns_Correct_Paging_Skip_Take()
        {
            using var db = CreateDbContext();
            SeedProducts(db);
            var service = CreateService(db);

            var page1 = await service.GetPagedAsync(new ProductQueryParams { Page = 1, PageSize = 5, SortBy = "price_asc" });
            var page2 = await service.GetPagedAsync(new ProductQueryParams { Page = 2, PageSize = 5, SortBy = "price_asc" });

            Assert.Equal(5, page1.Items.Count());
            Assert.Equal(5, page2.Items.Count());

            var ids1 = page1.Items.Select(x => x.Id).ToHashSet();
            Assert.DoesNotContain(page2.Items, x => ids1.Contains(x.Id));
        }

        [Fact]
        public async Task GetPagedAsync_PriceAsc_ThenBy_CreateAt_Descending_When_Same_Price()
        {
            using var db = CreateDbContext();

            var now = DateTime.UtcNow;

            db.Products.Add(new Product
            {
                ProductName = "SamePriceOld",
                ProductCode = "SP01",
                ProductDetails = new List<ProductDetail>
        {
            new ProductDetail { Price = 999, Quantity = 1, Status = "Active", CreateAt = now.AddDays(-2) }
        }
            });

            db.Products.Add(new Product
            {
                ProductName = "SamePriceNew",
                ProductCode = "SP02",
                ProductDetails = new List<ProductDetail>
        {
            new ProductDetail { Price = 999, Quantity = 1, Status = "Active", CreateAt = now.AddDays(-1) }
        }
            });

            db.SaveChanges();

            var service = CreateService(db);

            var res = await service.GetPagedAsync(new ProductQueryParams { Page = 1, PageSize = 10, SortBy = "price_asc", Keyword = "SamePrice" });

            var items = res.Items.ToList();
            Assert.Equal(2, items.Count);
            Assert.Equal("SamePriceNew", items[0].Name);
            Assert.Equal("SamePriceOld", items[1].Name);

        }

        [Fact]
        public async Task GetPagedAsync_Unknown_SortBy_Falls_Back_To_CreateAt_Desc()
        {
            using var db = CreateDbContext();
            SeedProducts(db);
            var service = CreateService(db);

            var res = await service.GetPagedAsync(new ProductQueryParams { Page = 1, PageSize = 30, SortBy = "something_else" });

            var created = res.Items.Select(x => x.CreatedAt).ToList();
            var sorted = created.OrderByDescending(x => x).ToList();
            Assert.Equal(sorted, created);
        }

        [Fact]
        public async Task GetHomeAsync_Featured_Is_Ordered_By_CreateAt_Desc()
        {
            using var db = CreateDbContext();
            SeedProducts(db);
            var service = CreateService(db);

            var home = await service.GetHomeAsync(new ProductQueryParams { Page = 1, PageSize = 10 });

            var created = home.Featured.Select(x => x.CreatedAt).ToList();
            var sorted = created.OrderByDescending(x => x).ToList();
            Assert.Equal(sorted, created);
        }

        [Fact]
        public async Task GetHomeAsync_NewArrivals_Includes_Zero_Stock_But_Active()
        {
            using var db = CreateDbContext();
            SeedProducts(db);
            var service = CreateService(db);

            var home = await service.GetHomeAsync(new ProductQueryParams { Page = 1, PageSize = 50 });

            Assert.Contains(home.NewArrivals, x => x.Name.StartsWith("ZeroStock"));
        }

        [Fact]
        public async Task GetHomeAsync_NewArrivals_Excludes_Inactive()
        {
            using var db = CreateDbContext();
            SeedProducts(db);
            var service = CreateService(db);

            var home = await service.GetHomeAsync(new ProductQueryParams { Page = 1, PageSize = 50 });

            Assert.DoesNotContain(home.NewArrivals, x => x.Name.StartsWith("Inactive"));
        }

        [Fact]
        public async Task GetHomeAsync_All_Uses_Same_Filtering_As_GetPagedAsync()
        {
            using var db = CreateDbContext();

            // 1 product latest inactive => phải bị loại ở All
            db.Products.Add(new Product
            {
                ProductName = "HomeAllLatestInactive",
                ProductCode = "HLI01",
                ProductDetails = new List<ProductDetail>
        {
            new ProductDetail { Price = 10, Quantity = 1, Status = "Active", CreateAt = DateTime.UtcNow.AddDays(-2) },
            new ProductDetail { Price = 20, Quantity = 1, Status = "Inactive", CreateAt = DateTime.UtcNow.AddDays(-1) }
        }
            });

            // 1 product latest null status => phải vào All
            db.Products.Add(new Product
            {
                ProductName = "HomeAllNullStatus",
                ProductCode = "HNS01",
                ProductDetails = new List<ProductDetail>
        {
            new ProductDetail { Price = 30, Quantity = 1, Status = null, CreateAt = DateTime.UtcNow }
        }
            });

            db.SaveChanges();

            var service = CreateService(db);

            var home = await service.GetHomeAsync(new ProductQueryParams { Page = 1, PageSize = 50, Keyword = "HomeAll" });

            Assert.DoesNotContain(home.All.Items, x => x.Name == "HomeAllLatestInactive");
            Assert.Contains(home.All.Items, x => x.Name == "HomeAllNullStatus");
        }

        [Fact]
        public async Task GetHomeAsync_All_Respects_Page_And_PageSize_Clamping()
        {
            using var db = CreateDbContext();
            SeedProducts(db);
            var service = CreateService(db);

            var home = await service.GetHomeAsync(new ProductQueryParams { Page = -5, PageSize = 9999 });

            Assert.Equal(1, home.All.Page);
            Assert.True(home.All.PageSize <= 60);
        }

        #endregion

    }
}
