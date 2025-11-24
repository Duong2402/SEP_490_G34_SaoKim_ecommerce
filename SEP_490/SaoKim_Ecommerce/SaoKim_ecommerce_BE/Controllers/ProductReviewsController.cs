using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using System.Security.Claims;

namespace SaoKim_ecommerce_BE.Controllers
{
	[ApiController]
	[Route("api/products/{productId:int}/reviews")]
	public class ProductReviewsController : ControllerBase
	{
		private readonly SaoKimDBContext _db;

		public ProductReviewsController(SaoKimDBContext db)
		{
			_db = db;
		}

		[HttpGet]
		public async Task<IActionResult> GetReviews([FromRoute] int productId)
		{
			var exists = await _db.Products.AnyAsync(p => p.ProductID == productId);
			if (!exists) return NotFound(new { message = "Product not found" });

			var reviews = await _db.Reviews
				.AsNoTracking()
				.Where(r => r.ProductID == productId)
				.OrderByDescending(r => r.CreatedAt)
				.Select(r => new
				{
					id = r.ReviewID,
					userId = r.UserID,
					userName = r.User.Name,
					rating = r.Rating,
					comment = r.Comment,
					createdAt = r.CreatedAt
				})
				.ToListAsync();

			var avg = reviews.Count > 0 ? reviews.Average(x => (double)x.rating) : 0.0;

			return Ok(new { items = reviews, averageRating = Math.Round(avg, 2), count = reviews.Count });
		}

		public record WriteReviewRequest(int Rating, string? Comment);

		[HttpPost]
		[Authorize]
		public async Task<IActionResult> WriteReview([FromRoute] int productId, [FromBody] WriteReviewRequest req)
		{
			if (req == null || req.Rating < 1 || req.Rating > 5)
				return BadRequest(new { message = "Rating must be between 1 and 5" });

			var product = await _db.Products.FirstOrDefaultAsync(p => p.ProductID == productId);
			if (product == null) return NotFound(new { message = "Product not found" });

			var userIdStr = User.FindFirstValue("UserId");
			if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out var userId))
				return Unauthorized();

			var existing = await _db.Reviews.FirstOrDefaultAsync(r => r.ProductID == productId && r.UserID == userId);
			if (existing == null)
			{
				var review = new Review
				{
					ProductID = productId,
					UserID = userId,
					Rating = req.Rating,
					Comment = string.IsNullOrWhiteSpace(req.Comment) ? null : req.Comment.Trim(),
					CreatedAt = DateTime.UtcNow
				};
				_db.Reviews.Add(review);
				await _db.SaveChangesAsync();
			}
			else
			{
				existing.Rating = req.Rating;
				existing.Comment = string.IsNullOrWhiteSpace(req.Comment) ? null : req.Comment.Trim();
				existing.CreatedAt = DateTime.UtcNow;
				await _db.SaveChangesAsync();
			}

			return await GetReviews(productId);
		}
	}
}