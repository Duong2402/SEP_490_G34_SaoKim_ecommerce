using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Services;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class ProductReviewsControllerTests
    {
        private static ProductReviewsController CreateController(
            Mock<IProductReviewService> svcMock,
            int? userId = null)
        {
            var controller = new ProductReviewsController(svcMock.Object);

            var httpContext = new DefaultHttpContext();

            if (userId.HasValue)
            {
                httpContext.User = new ClaimsPrincipal(
                    new ClaimsIdentity(
                        new[] { new Claim("UserId", userId.Value.ToString()) },
                        "TestAuth"));
            }

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };

            return controller;
        }

        [Fact]
        public async Task GetReviews_ReturnsOk_WithItemsAverageCount()
        {
            var svc = new Mock<IProductReviewService>(MockBehavior.Strict);

            var serviceResult = new ProductReviewSummaryDto
            {
                Items = new(),
                AverageRating = 4.5,
                Count = 10
            };

            svc.Setup(s => s.GetReviewsAsync(1))
               .Returns(Task.FromResult(serviceResult));

            var controller = CreateController(svc);

            var result = await controller.GetReviews(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var value = ok.Value!;

            Assert.Equal(4.5, (double)value.GetType().GetProperty("averageRating")!.GetValue(value)!);
            Assert.Equal(10, (int)value.GetType().GetProperty("count")!.GetValue(value)!);

            svc.Verify(s => s.GetReviewsAsync(1), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task GetReviews_ReturnsNotFound_WhenServiceThrowsKeyNotFound()
        {
            var svc = new Mock<IProductReviewService>(MockBehavior.Strict);

            svc.Setup(s => s.GetReviewsAsync(999))
               .ThrowsAsync(new KeyNotFoundException("Không tìm thấy sản phẩm"));

            var controller = CreateController(svc);

            var result = await controller.GetReviews(999);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var msg = nf.Value?.GetType().GetProperty("message")?.GetValue(nf.Value)?.ToString();
            Assert.Equal("Không tìm thấy sản phẩm", msg);

            svc.Verify(s => s.GetReviewsAsync(999), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task WriteReview_ReturnsBadRequest_WhenReqNull()
        {
            var svc = new Mock<IProductReviewService>(MockBehavior.Strict);
            var controller = CreateController(svc, userId: 1);

            var result = await controller.WriteReview(1, null!);

            Assert.IsType<BadRequestObjectResult>(result);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task WriteReview_ReturnsUnauthorized_WhenNoUserIdClaim()
        {
            var svc = new Mock<IProductReviewService>(MockBehavior.Strict);
            var controller = CreateController(svc, userId: null);

            var result = await controller.WriteReview(1, new WriteReviewRequestDto
            {
                Rating = 5,
                Comment = "ok"
            });

            Assert.IsType<UnauthorizedResult>(result);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task WriteReview_ReturnsOk_WhenServiceSucceeds()
        {
            var svc = new Mock<IProductReviewService>(MockBehavior.Strict);

            var summary = new ProductReviewSummaryDto
            {
                Items = new(),
                AverageRating = 4.0,
                Count = 3
            };

            svc.Setup(s => s.WriteOrUpdateReviewAsync(1, 10, 5, "nice"))
               .Returns(Task.FromResult(summary));

            var controller = CreateController(svc, userId: 10);

            var result = await controller.WriteReview(1, new WriteReviewRequestDto
            {
                Rating = 5,
                Comment = "nice"
            });

            var ok = Assert.IsType<OkObjectResult>(result);
            var value = ok.Value!;

            Assert.Equal(4.0, (double)value.GetType().GetProperty("averageRating")!.GetValue(value)!);
            Assert.Equal(3, (int)value.GetType().GetProperty("count")!.GetValue(value)!);

            svc.Verify(s => s.WriteOrUpdateReviewAsync(1, 10, 5, "nice"), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task WriteReview_ReturnsBadRequest_WhenServiceThrowsInvalidOperation()
        {
            var svc = new Mock<IProductReviewService>(MockBehavior.Strict);

            svc.Setup(s => s.WriteOrUpdateReviewAsync(1, 10, 1, "bad"))
               .ThrowsAsync(new InvalidOperationException("Bạn chưa mua sản phẩm"));

            var controller = CreateController(svc, userId: 10);

            var result = await controller.WriteReview(1, new WriteReviewRequestDto
            {
                Rating = 1,
                Comment = "bad"
            });

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var msg = br.Value?.GetType().GetProperty("message")?.GetValue(br.Value)?.ToString();
            Assert.Equal("Bạn chưa mua sản phẩm", msg);

            svc.Verify(s => s.WriteOrUpdateReviewAsync(1, 10, 1, "bad"), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task WriteReview_ReturnsNotFound_WhenServiceThrowsKeyNotFound()
        {
            var svc = new Mock<IProductReviewService>(MockBehavior.Strict);

            svc.Setup(s => s.WriteOrUpdateReviewAsync(999, 10, 5, "x"))
               .ThrowsAsync(new KeyNotFoundException("Không tìm thấy sản phẩm"));

            var controller = CreateController(svc, userId: 10);

            var result = await controller.WriteReview(999, new WriteReviewRequestDto
            {
                Rating = 5,
                Comment = "x"
            });

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var msg = nf.Value?.GetType().GetProperty("message")?.GetValue(nf.Value)?.ToString();
            Assert.Equal("Không tìm thấy sản phẩm", msg);

            svc.Verify(s => s.WriteOrUpdateReviewAsync(999, 10, 5, "x"), Times.Once);
            svc.VerifyNoOtherCalls();
        }
    }
}
