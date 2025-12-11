using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Services;
using System.Security.Claims;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/products/{productId:int}/reviews")]
    public class ProductReviewsController : ControllerBase
    {
        private readonly IProductReviewService _svc;

        public ProductReviewsController(IProductReviewService svc)
        {
            _svc = svc;
        }

        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ProductReviewSummaryDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetReviews([FromRoute] int productId)
        {
            try
            {
                var result = await _svc.GetReviewsAsync(productId);
                return Ok(new
                {
                    items = result.Items,
                    averageRating = result.AverageRating,
                    count = result.Count
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> WriteReview(
            [FromRoute] int productId,
            [FromBody] WriteReviewRequestDto req)
        {
            if (req == null)
                return BadRequest(new { message = "D? li?u không h?p l?" });

            var userIdStr = User.FindFirstValue("UserId");
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out var userId))
                return Unauthorized();

            try
            {
                var result = await _svc.WriteOrUpdateReviewAsync(
                    productId,
                    userId,
                    req.Rating,
                    req.Comment);

                return Ok(new
                {
                    items = result.Items,
                    averageRating = result.AverageRating,
                    count = result.Count
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}
