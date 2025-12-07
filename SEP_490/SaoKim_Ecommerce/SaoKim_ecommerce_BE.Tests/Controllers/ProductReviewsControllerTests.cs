using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;


namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class ProductReviewsControllerTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new SaoKimDBContext(options);
        }

        private ProductReviewsController CreateController(SaoKimDBContext db, int? userId = null, string? customUserIdClaimValue = null)
        {
            var controller = new ProductReviewsController(db);
            var httpContext = new DefaultHttpContext();

            if (customUserIdClaimValue != null)
            {
                var identity = new ClaimsIdentity(
                    new[] { new Claim("UserId", customUserIdClaimValue) },
                    "TestAuth");
                httpContext.User = new ClaimsPrincipal(identity);
            }
            else if (userId.HasValue)
            {
                var identity = new ClaimsIdentity(
                    new[] { new Claim("UserId", userId.Value.ToString()) },
                    "TestAuth");
                httpContext.User = new ClaimsPrincipal(identity);
            }

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };

            return controller;
        }

        #region GetReviews

        [Fact]
        public async Task GetReviews_ReturnsNotFound_WhenProductNotExist()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db);

            var result = await controller.GetReviews(999);

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task GetReviews_ReturnsEmptyListAndZeroAverage_WhenNoReviews()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var result = await controller.GetReviews(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var type = ok.Value!.GetType();
            var items = (System.Collections.IList)type.GetProperty("items")!.GetValue(ok.Value)!;
            var avg = (double)type.GetProperty("averageRating")!.GetValue(ok.Value)!;
            var count = (int)type.GetProperty("count")!.GetValue(ok.Value)!;

            Assert.Empty(items);
            Assert.Equal(0.0, avg);
            Assert.Equal(0, count);
        }

        [Fact]
        public async Task GetReviews_ReturnsOnlyReviewsOfGivenProduct()
        {
            using var db = CreateDbContext();
            db.Products.AddRange(
                new Product { ProductID = 1, ProductName = "P1" },
                new Product { ProductID = 2, ProductName = "P2" }
            );

            var user = new User { UserID = 1, Name = "User1" };
            db.Users.Add(user);

            db.Reviews.AddRange(
                new Review { ReviewID = 1, ProductID = 1, UserID = 1, Rating = 4, Comment = "P1", CreatedAt = DateTime.UtcNow },
                new Review { ReviewID = 2, ProductID = 2, UserID = 1, Rating = 5, Comment = "P2", CreatedAt = DateTime.UtcNow }
            );
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var result = await controller.GetReviews(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var type = ok.Value!.GetType();
            var items = (System.Collections.IList)type.GetProperty("items")!.GetValue(ok.Value)!;
            var count = (int)type.GetProperty("count")!.GetValue(ok.Value)!;

            Assert.Single(items);
            Assert.Equal(1, count);
        }

        [Fact]
        public async Task GetReviews_OrdersByCreatedAtDescending()
        {
            using var db = CreateDbContext();
            var product = new Product { ProductID = 1, ProductName = "P1" };
            db.Products.Add(product);
            var user = new User { UserID = 1, Name = "User1" };
            db.Users.Add(user);

            db.Reviews.AddRange(
                new Review { ReviewID = 1, ProductID = 1, UserID = 1, Rating = 3, Comment = "Old", CreatedAt = DateTime.UtcNow.AddMinutes(-10) },
                new Review { ReviewID = 2, ProductID = 1, UserID = 1, Rating = 5, Comment = "New", CreatedAt = DateTime.UtcNow }
            );
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var result = await controller.GetReviews(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var type = ok.Value!.GetType();
            var items = (System.Collections.IList)type.GetProperty("items")!.GetValue(ok.Value)!;

            Assert.Equal(2, items.Count);

            var first = items[0]!;
            var nameProp = first.GetType().GetProperty("comment")!;
            var firstComment = (string)nameProp.GetValue(first)!;

            Assert.Equal("New", firstComment);
        }

        [Fact]
        public async Task GetReviews_IncludesUserName()
        {
            using var db = CreateDbContext();
            var product = new Product { ProductID = 1, ProductName = "P1" };
            var user = new User { UserID = 1, Name = "UserName" };
            db.Products.Add(product);
            db.Users.Add(user);
            db.Reviews.Add(new Review
            {
                ReviewID = 1,
                ProductID = 1,
                UserID = 1,
                Rating = 4,
                Comment = "Good",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var result = await controller.GetReviews(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var type = ok.Value!.GetType();
            var items = (System.Collections.IList)type.GetProperty("items")!.GetValue(ok.Value)!;
            var first = items[0]!;
            var userName = (string?)first.GetType().GetProperty("userName")!.GetValue(first);

            Assert.Equal("UserName", userName);
        }

        [Fact]
        public async Task GetReviews_ComputesAverageRatingRoundedToTwoDecimals()
        {
            using var db = CreateDbContext();
            var product = new Product { ProductID = 1, ProductName = "P1" };
            var user = new User { UserID = 1, Name = "U1" };
            db.Products.Add(product);
            db.Users.Add(user);

            db.Reviews.AddRange(
                new Review { ReviewID = 1, ProductID = 1, UserID = 1, Rating = 4, Comment = "ok", CreatedAt = DateTime.UtcNow },
                new Review { ReviewID = 2, ProductID = 1, UserID = 1, Rating = 5, Comment = "good", CreatedAt = DateTime.UtcNow }
            );
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var result = await controller.GetReviews(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var type = ok.Value!.GetType();
            var avg = (double)type.GetProperty("averageRating")!.GetValue(ok.Value)!;

            Assert.Equal(4.5, avg);
        }

        [Fact]
        public async Task GetReviews_CountMatchesItems()
        {
            using var db = CreateDbContext();
            var product = new Product { ProductID = 1, ProductName = "P1" };
            var user = new User { UserID = 1, Name = "U1" };
            db.Products.Add(product);
            db.Users.Add(user);

            db.Reviews.AddRange(
                new Review { ReviewID = 1, ProductID = 1, UserID = 1, Rating = 3, Comment = "1", CreatedAt = DateTime.UtcNow },
                new Review { ReviewID = 2, ProductID = 1, UserID = 1, Rating = 4, Comment = "2", CreatedAt = DateTime.UtcNow },
                new Review { ReviewID = 3, ProductID = 1, UserID = 1, Rating = 5, Comment = "3", CreatedAt = DateTime.UtcNow }
            );
            await db.SaveChangesAsync();

            var controller = CreateController(db);

            var result = await controller.GetReviews(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var type = ok.Value!.GetType();
            var items = (System.Collections.IList)type.GetProperty("items")!.GetValue(ok.Value)!;
            var count = (int)type.GetProperty("count")!.GetValue(ok.Value)!;

            Assert.Equal(items.Count, count);
        }

        #endregion

        #region WriteReview – validation & auth

        [Fact]
        public async Task WriteReview_ReturnsBadRequest_WhenRequestIsNull()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: 1);

            var result = await controller.WriteReview(1, null!);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task WriteReview_ReturnsBadRequest_WhenRatingBelowOne()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: 1);
            var req = new ProductReviewsController.WriteReviewRequest(0, "Bad");

            var result = await controller.WriteReview(1, req);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task WriteReview_ReturnsBadRequest_WhenRatingAboveFive()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: 1);
            var req = new ProductReviewsController.WriteReviewRequest(6, "Too high");

            var result = await controller.WriteReview(1, req);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task WriteReview_ReturnsNotFound_WhenProductNotExist()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db, userId: 1);
            var req = new ProductReviewsController.WriteReviewRequest(4, "Test");

            var result = await controller.WriteReview(999, req);

            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task WriteReview_ReturnsUnauthorized_WhenNoUserClaim()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: null);
            var req = new ProductReviewsController.WriteReviewRequest(4, "Test");

            var result = await controller.WriteReview(1, req);

            Assert.IsType<UnauthorizedResult>(result);
        }

        [Fact]
        public async Task WriteReview_ReturnsUnauthorized_WhenUserIdClaimNotInt()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: null, customUserIdClaimValue: "abc");
            var req = new ProductReviewsController.WriteReviewRequest(4, "Test");

            var result = await controller.WriteReview(1, req);

            Assert.IsType<UnauthorizedResult>(result);
        }

        #endregion

        #region WriteReview – create vs update

        [Fact]
        public async Task WriteReview_CreatesNewReview_WhenNotExisting()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: 10);
            var req = new ProductReviewsController.WriteReviewRequest(5, "Great");

            var result = await controller.WriteReview(1, req);

            Assert.IsType<OkObjectResult>(result);

            var review = await db.Reviews.FirstOrDefaultAsync(r => r.ProductID == 1 && r.UserID == 10);
            Assert.NotNull(review);
            Assert.Equal(5, review!.Rating);
            Assert.Equal("Great", review.Comment);
        }

        [Fact]
        public async Task WriteReview_UpdatesExistingReview_WhenAlreadyExists()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            db.Users.Add(new User { UserID = 10, Name = "U" });
            db.Reviews.Add(new Review
            {
                ReviewID = 1,
                ProductID = 1,
                UserID = 10,
                Rating = 2,
                Comment = "Old",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: 10);
            var req = new ProductReviewsController.WriteReviewRequest(4, "New comment");

            var result = await controller.WriteReview(1, req);

            Assert.IsType<OkObjectResult>(result);

            var review = await db.Reviews.FirstAsync(r => r.ProductID == 1 && r.UserID == 10);
            Assert.Equal(4, review.Rating);
            Assert.Equal("New comment", review.Comment);
        }

        [Fact]
        public async Task WriteReview_TrimsComment_OnCreate()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: 10);
            var req = new ProductReviewsController.WriteReviewRequest(5, "  Nice product  ");

            var result = await controller.WriteReview(1, req);

            Assert.IsType<OkObjectResult>(result);

            var review = await db.Reviews.FirstAsync(r => r.ProductID == 1 && r.UserID == 10);
            Assert.Equal("Nice product", review.Comment);
        }

        [Fact]
        public async Task WriteReview_SetsCommentNull_WhenWhitespaceOnly()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: 10);
            var req = new ProductReviewsController.WriteReviewRequest(5, "   ");

            var result = await controller.WriteReview(1, req);

            Assert.IsType<OkObjectResult>(result);

            var review = await db.Reviews.FirstAsync(r => r.ProductID == 1 && r.UserID == 10);
            Assert.Null(review.Comment);
        }

        [Fact]
        public async Task WriteReview_UpdatesCreatedAt_OnUpdate()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            db.Users.Add(new User { UserID = 10, Name = "U" });

            var oldTime = DateTime.UtcNow.AddHours(-2);

            db.Reviews.Add(new Review
            {
                ReviewID = 1,
                ProductID = 1,
                UserID = 10,
                Rating = 3,
                Comment = "Old",
                CreatedAt = oldTime
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: 10);
            var req = new ProductReviewsController.WriteReviewRequest(4, "Updated");

            var result = await controller.WriteReview(1, req);

            Assert.IsType<OkObjectResult>(result);

            var review = await db.Reviews.FirstAsync(r => r.ProductID == 1 && r.UserID == 10);
            Assert.True(review.CreatedAt > oldTime);
        }

        #endregion

        #region WriteReview – response envelope & side effects

        [Fact]
        public async Task WriteReview_ReturnsGetReviewsEnvelope_AfterCreate()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            db.Users.Add(new User { UserID = 10, Name = "U1" });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: 10);
            var req = new ProductReviewsController.WriteReviewRequest(5, "Cmt");

            var result = await controller.WriteReview(1, req);

            var ok = Assert.IsType<OkObjectResult>(result);
            var type = ok.Value!.GetType();
            Assert.NotNull(type.GetProperty("items"));
            Assert.NotNull(type.GetProperty("averageRating"));
            Assert.NotNull(type.GetProperty("count"));
        }

        [Fact]
        public async Task WriteReview_ReturnsSingleReviewCount_AfterCreate()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            db.Users.Add(new User { UserID = 10, Name = "U1" });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: 10);
            var req = new ProductReviewsController.WriteReviewRequest(4, "Cmt");

            var result = await controller.WriteReview(1, req);

            var ok = Assert.IsType<OkObjectResult>(result);
            var type = ok.Value!.GetType();
            var count = (int)type.GetProperty("count")!.GetValue(ok.Value)!;

            Assert.Equal(1, count);
        }

        [Fact]
        public async Task WriteReview_DoesNotAffectOtherProducts()
        {
            using var db = CreateDbContext();
            db.Products.AddRange(
                new Product { ProductID = 1, ProductName = "P1" },
                new Product { ProductID = 2, ProductName = "P2" }
            );
            db.Users.Add(new User { UserID = 10, Name = "U1" });
            db.Reviews.Add(new Review
            {
                ReviewID = 1,
                ProductID = 2,
                UserID = 10,
                Rating = 2,
                Comment = "Other product",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: 10);
            var req = new ProductReviewsController.WriteReviewRequest(5, "New");

            var result = await controller.WriteReview(1, req);

            Assert.IsType<OkObjectResult>(result);

            var product1Reviews = await db.Reviews.CountAsync(r => r.ProductID == 1);
            var product2Reviews = await db.Reviews.CountAsync(r => r.ProductID == 2);

            Assert.Equal(1, product1Reviews);
            Assert.Equal(1, product2Reviews);
        }

        [Fact]
        public async Task WriteReview_AllowsMultipleUsersReviews_ForSameProduct()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            db.Users.AddRange(
                new User { UserID = 10, Name = "U1" },
                new User { UserID = 20, Name = "U2" }
            );
            await db.SaveChangesAsync();

            var controller1 = CreateController(db, userId: 10);
            var req1 = new ProductReviewsController.WriteReviewRequest(4, "From U1");
            await controller1.WriteReview(1, req1);

            var controller2 = CreateController(db, userId: 20);
            var req2 = new ProductReviewsController.WriteReviewRequest(5, "From U2");
            await controller2.WriteReview(1, req2);

            var reviews = await db.Reviews.Where(r => r.ProductID == 1).ToListAsync();
            Assert.Equal(2, reviews.Count);
            Assert.Contains(reviews, r => r.UserID == 10);
            Assert.Contains(reviews, r => r.UserID == 20);
        }

        [Fact]
        public async Task WriteReview_SetsUserIdFromClaims()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            db.Users.Add(new User { UserID = 10, Name = "U1" });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: 10);
            var req = new ProductReviewsController.WriteReviewRequest(3, "Test");

            var result = await controller.WriteReview(1, req);

            Assert.IsType<OkObjectResult>(result);

            var review = await db.Reviews.FirstOrDefaultAsync(r => r.ProductID == 1 && r.UserID == 10);
            Assert.NotNull(review);
        }

        [Fact]
        public async Task WriteReview_UpdatesAverageRating_AfterCreateAndUpdate()
        {
            using var db = CreateDbContext();
            db.Products.Add(new Product { ProductID = 1, ProductName = "P1" });
            db.Users.Add(new User { UserID = 10, Name = "U1" });
            await db.SaveChangesAsync();

            var controller = CreateController(db, userId: 10);

            var req1 = new ProductReviewsController.WriteReviewRequest(5, "First");
            var result1 = await controller.WriteReview(1, req1);
            var ok1 = Assert.IsType<OkObjectResult>(result1);
            var type1 = ok1.Value!.GetType();
            var avg1 = (double)type1.GetProperty("averageRating")!.GetValue(ok1.Value)!;
            Assert.Equal(5.0, avg1);

            var req2 = new ProductReviewsController.WriteReviewRequest(3, "Update");
            var result2 = await controller.WriteReview(1, req2);
            var ok2 = Assert.IsType<OkObjectResult>(result2);
            var type2 = ok2.Value!.GetType();
            var avg2 = (double)type2.GetProperty("averageRating")!.GetValue(ok2.Value)!;

            Assert.Equal(3.0, avg2);
        }

        #endregion
    }
}
