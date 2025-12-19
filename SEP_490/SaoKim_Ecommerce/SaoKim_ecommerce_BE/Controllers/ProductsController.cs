using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Helpers;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services;
using SaoKim_ecommerce_BE.Services.Realtime;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        private readonly IWebHostEnvironment _env;
        private readonly IRealtimePublisher _rt;
        private readonly IProductService _productService;

        public ProductsController(SaoKimDBContext db, IWebHostEnvironment env, IRealtimePublisher rt, IProductService productService)
        {
            _db = db;
            _env = env;
            _rt = rt;
            _productService = productService;
        }

        // GET: /api/products
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? q,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortBy = "new",
            [FromQuery] string? sortDir = "desc",
            [FromQuery] string? category = null)
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 10;

            // Chuyển category name sang categoryId nếu có
            int? categoryId = null;
            if (!string.IsNullOrWhiteSpace(category))
            {
                var cat = category.Trim().ToLowerInvariant();
                categoryId = await _db.Categories
                    .AsNoTracking()
                    .Where(c => c.Name != null && c.Name.ToLower() == cat)
                    .Select(c => (int?)c.Id)
                    .FirstOrDefaultAsync();
            }

            var query = new ProductQueryParams
            {
                Page = page,
                PageSize = pageSize,
                SortBy = sortBy ?? "new",
                Keyword = string.IsNullOrWhiteSpace(q) ? null : q.Trim(),
                CategoryId = categoryId
            };

            // Dùng ProductService - đã apply promotion
            var result = await _productService.GetPagedAsync(query);

            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            // Map sang format cũ để không break FE
            var items = result.Items.Select(x => new
            {
                id = x.Id,
                sku = x.Sku,
                name = x.Name,
                category = (string?)null, // Category name không có trong DTO, để null
                price = x.Price,
                originalPrice = x.OriginalPrice,
                unit = x.Unit,
                stock = x.Quantity,
                status = x.Status,
                created = x.CreatedAt,
                image = !string.IsNullOrEmpty(x.ThumbnailUrl)
                    ? (x.ThumbnailUrl.StartsWith("http") ? x.ThumbnailUrl : $"{baseUrl}/images/{x.ThumbnailUrl}")
                    : null,
                inProject = false // Không có info này trong DTO
            }).ToList();

            var payload = new
            {
                items,
                page = result.Page,
                pageSize = result.PageSize,
                total = result.TotalItems,
                totalPages = (int)Math.Ceiling(result.TotalItems / (double)result.PageSize)
            };

            return Ok(ApiResponse<object>.Ok(payload));
        }

        // GET: /api/products/{id}
        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            var rawProduct = await _db.Products
                .AsNoTracking()
                .Where(p => p.ProductID == id)
                .Select(p => new
                {
                    Product = p,
                    Detail = p.ProductDetails
                        .OrderByDescending(d => d.Id)
                        .FirstOrDefault(),
                    HasProjects = p.ProjectProducts.Any()
                })
                .FirstOrDefaultAsync();

            if (rawProduct == null || rawProduct.Detail == null)
                return NotFound(new { message = "Product not found" });

            // Lấy thông tin khuyến mãi cho sản phẩm này
            var now = DateTimeOffset.UtcNow;
            var basePrice = rawProduct.Detail.Price;
            decimal? originalPrice = null;
            decimal finalPrice = basePrice;
            int? appliedPromotionId = null;
            string? appliedPromotionName = null;
            string? appliedDiscountType = null;
            decimal? appliedDiscountValue = null;

            var promoRows = await (from pp in _db.PromotionProducts.AsNoTracking()
                                   join pr in _db.Promotions.AsNoTracking() on pp.PromotionId equals pr.Id
                                   where pp.ProductId == id
                                         && (pr.Status == PromotionStatus.Active || pr.Status == PromotionStatus.Scheduled)
                                         && pr.StartDate <= now
                                         && now <= pr.EndDate
                                   orderby pr.StartDate descending
                                   select new
                                   {
                                       pr.Id,
                                       pr.Name,
                                       pr.DiscountType,
                                       pr.DiscountValue,
                                       pr.StartDate
                                   })
                                   .ToListAsync();

            // Tìm khuyến mãi tốt nhất (giá thấp nhất)
            foreach (var promo in promoRows)
            {
                decimal candidate;
                if (promo.DiscountType == DiscountType.Percentage)
                {
                    candidate = basePrice * (1m - (promo.DiscountValue / 100m));
                }
                else // FixedAmount
                {
                    candidate = basePrice - promo.DiscountValue;
                }
                if (candidate < 0) candidate = 0;
                candidate = Math.Round(candidate, 2, MidpointRounding.AwayFromZero);

                if (candidate < finalPrice)
                {
                    finalPrice = candidate;
                    originalPrice = basePrice;
                    appliedPromotionId = promo.Id;
                    appliedPromotionName = promo.Name;
                    appliedDiscountType = promo.DiscountType.ToString();
                    appliedDiscountValue = promo.DiscountValue;
                }
            }

            var product = new
            {
                id = rawProduct.Product.ProductID,
                sku = rawProduct.Product.ProductCode,
                name = rawProduct.Product.ProductName,
                category = rawProduct.Detail.Category != null
                    ? rawProduct.Detail.Category.Name
                    : null,
                price = finalPrice,
                originalPrice = originalPrice,
                promotionId = appliedPromotionId,
                promotionName = appliedPromotionName,
                discountType = appliedDiscountType,
                discountValue = appliedDiscountValue,
                unit = rawProduct.Detail.Unit ?? "",
                stock = rawProduct.Detail.Quantity,
                status = rawProduct.Detail.Status,
                created = rawProduct.Detail.CreateAt,
                categoryId = rawProduct.Detail.CategoryId,
                quantity = rawProduct.Detail.Quantity,
                description = rawProduct.Detail.Description,
                supplier = rawProduct.Detail.Supplier,
                image = rawProduct.Detail.Image != null
                    ? $"{baseUrl}/images/{rawProduct.Detail.Image}"
                    : null,
                note = rawProduct.Detail.Note,
                inProject = rawProduct.HasProjects,
                updateAt = rawProduct.Detail.UpdateAt
            };

            var relatedQuery = _db.Products
                .AsNoTracking()
                .Where(p => p.ProductID != id);

            if (!string.IsNullOrEmpty(product.category))
            {
                relatedQuery = relatedQuery
                    .Where(p => p.ProductDetails.Any(d =>
                        d.Category != null && d.Category.Name == product.category));
            }

            var related = await relatedQuery
                .Select(p => new
                {
                    Product = p,
                    Detail = p.ProductDetails
                        .OrderByDescending(d => d.Id)
                        .FirstOrDefault()
                })
                .OrderByDescending(x => x.Detail != null ? x.Detail.CreateAt : null)
                .Take(8)
                .Select(x => new
                {
                    id = x.Product.ProductID,
                    name = x.Product.ProductName,
                    price = x.Detail != null ? x.Detail.Price : 0,
                    image = x.Detail != null && x.Detail.Image != null
                        ? $"{baseUrl}/images/{x.Detail.Image}"
                        : null
                })
                .ToListAsync();

            return Ok(new { product, related });
        }

        // PATCH: /api/products/{id}/status
        [HttpPatch("{id:int}/status")]
        [Authorize(Roles = "Staff")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateProductStatusRequest req)
        {
            var newStatusRaw = (req.Status ?? "").Trim();

            if (string.IsNullOrEmpty(newStatusRaw))
            {
                return BadRequest(new { message = "Trạng thái mới không được để trống." });
            }

            var allowed = new[] { "Active", "Inactive" };

            var canonicalStatus = allowed
                .FirstOrDefault(s => s.Equals(newStatusRaw, StringComparison.OrdinalIgnoreCase));

            if (canonicalStatus == null)
            {
                return BadRequest(new { message = "Trạng thái không hợp lệ." });
            }

            var product = await _db.Products
                .Include(p => p.ProductDetails)
                .FirstOrDefaultAsync(p => p.ProductID == id);

            if (product == null)
            {
                return NotFound(new { message = "Product not found" });
            }

            var detail = product.ProductDetails
                .OrderByDescending(d => d.Id)
                .FirstOrDefault();

            if (detail == null)
            {
                return BadRequest(new { message = "Product chưa có thông tin chi tiết để cập nhật trạng thái." });
            }

            detail.Status = canonicalStatus;
            detail.UpdateAt = DateTime.UtcNow;
            detail.UpdateBy = User?.Identity?.Name ?? "system";

            await _db.SaveChangesAsync();

            await _rt.PublishToRoleAsync("staff", "product.status_changed", new
            {
                id,
                status = detail.Status
            });

            return Ok(new
            {
                message = "Status updated successfully",
                status = detail.Status
            });
        }

        // POST: /api/products
        [HttpPost]
        [AllowAnonymous]
        // [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromForm] CreateProductDto model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var product = new Product
            {
                ProductName = model.Name,
                ProductCode = ""
            };

            _db.Products.Add(product);
            await _db.SaveChangesAsync();

            product.ProductCode = ProductCodeGenerator.Generate(product.ProductName, product.ProductID);
            _db.Products.Update(product);
            await _db.SaveChangesAsync();

            string? imageFileName = null;

            if (model.ImageFile != null && model.ImageFile.Length > 0)
            {
                var uploadsFolder = Path.Combine(_env.WebRootPath ?? "wwwroot", "images");
                Directory.CreateDirectory(uploadsFolder);

                var ext = Path.GetExtension(model.ImageFile.FileName);
                var fileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var stream = System.IO.File.Create(filePath))
                {
                    await model.ImageFile.CopyToAsync(stream);
                }

                imageFileName = fileName;
            }

            var now = DateTime.UtcNow;

            var detail = new ProductDetail
            {
                ProductID = product.ProductID,
                CategoryId = model.CategoryId,
                Unit = model.Unit,
                Price = model.Price,
                Quantity = model.Quantity,
                Status = model.Active ? "Active" : "Inactive",
                Description = model.Description,
                Supplier = model.Supplier,
                Note = model.Note,
                Image = imageFileName,
                CreateAt = now,
            };

            _db.ProductDetails.Add(detail);
            await _db.SaveChangesAsync();

            await _rt.PublishToRoleAsync("staff", "product.created", new
            {
                id = product.ProductID,
                sku = product.ProductCode,
                name = product.ProductName,
                price = detail.Price,
                stock = detail.Quantity,
                status = detail.Status,
                categoryId = detail.CategoryId
            });

            return CreatedAtAction(nameof(GetById), new { id = product.ProductID }, new
            {
                id = product.ProductID,
                sku = product.ProductCode,
                name = product.ProductName
            });
        }

        // PUT: /api/products/{id}
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromForm] UpdateProductDto model)
        {
            var product = await _db.Products
                .Include(p => p.ProductDetails)
                .FirstOrDefaultAsync(p => p.ProductID == id);

            if (product == null)
                return NotFound(new { message = "Product not found" });

            product.ProductName = model.Name;

            product.ProductCode = ProductCodeGenerator.Generate(product.ProductName, product.ProductID);

            if (string.IsNullOrWhiteSpace(model.Unit))
                return BadRequest(new { message = "Đơn vị tính là bắt buộc" });

            var uom = await _db.UnitOfMeasures
                .FirstOrDefaultAsync(u => u.Name == model.Unit && u.Status == "Active");

            if (uom == null)
                return BadRequest(new { message = "Đơn vị tính không tồn tại hoặc đang ngưng sử dụng" });

            var detail = product.ProductDetails
                .OrderByDescending(d => d.Id)
                .FirstOrDefault();

            var now = DateTime.UtcNow;

            if (detail == null)
            {
                detail = new ProductDetail
                {
                    ProductID = product.ProductID,
                    CreateAt = now,
                    CreateBy = model.UpdateBy ?? "system"
                };
                _db.ProductDetails.Add(detail);
            }

            detail.CategoryId = model.CategoryId;
            detail.Unit = uom.Name;
            detail.Price = model.Price;
            detail.Quantity = model.Quantity;
            detail.Status = model.Active ? "Active" : "Inactive";
            detail.Description = model.Description;
            detail.Supplier = model.Supplier;
            detail.Note = model.Note;
            detail.UpdateAt = now;
            detail.UpdateBy = model.UpdateBy ?? detail.UpdateBy;

            if (model.ImageFile != null && model.ImageFile.Length > 0)
            {
                var uploadsFolder = Path.Combine(_env.WebRootPath ?? "wwwroot", "images");
                Directory.CreateDirectory(uploadsFolder);

                if (!string.IsNullOrEmpty(detail.Image))
                {
                    var oldPath = Path.Combine(uploadsFolder, detail.Image);
                    if (System.IO.File.Exists(oldPath))
                        System.IO.File.Delete(oldPath);
                }

                var ext = Path.GetExtension(model.ImageFile.FileName);
                var fileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var stream = System.IO.File.Create(filePath))
                {
                    await model.ImageFile.CopyToAsync(stream);
                }

                detail.Image = fileName;
            }

            await _db.SaveChangesAsync();

            await _rt.PublishToRoleAsync("staff", "product.updated", new
            {
                id = product.ProductID,
                sku = product.ProductCode,
                name = product.ProductName,
                price = detail.Price,
                stock = detail.Quantity,
                status = detail.Status,
                categoryId = detail.CategoryId
            });

            return Ok(new { message = "Product updated successfully" });
        }

        // DELETE: /api/products/{id}
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Staff")]
        public async Task<IActionResult> Delete(int id)
        {
            var product = await _db.Products
                .Include(p => p.ProductDetails)
                .Include(p => p.ProjectProducts)
                .FirstOrDefaultAsync(p => p.ProductID == id);

            if (product == null)
                return NotFound(new { message = "Product not found" });

            var hasProjects = product.ProjectProducts != null && product.ProjectProducts.Any();
            if (hasProjects)
            {
                return BadRequest(new
                {
                    message = "Sản phẩm đang được sử dụng trong dự án, không được phép xóa."
                });
            }

            _db.Products.Remove(product);
            await _db.SaveChangesAsync();

            await _rt.PublishToRoleAsync("staff", "product.deleted", new
            {
                id
            });

            return Ok(new { message = "Product deleted successfully" });
        }

        // GET: api/products/home
        [HttpGet("home")]
        [AllowAnonymous]
        public async Task<IActionResult> GetHomeProducts(
            [FromQuery] int Page = 1,
            [FromQuery] int PageSize = 12,
            [FromQuery] string? SortBy = "new",
            [FromQuery] string? Keyword = null,
            [FromQuery] string? Category = null,
            [FromQuery] int NewWithinDays = 14
        )
        {
            Page = Math.Max(1, Page);
            PageSize = Math.Clamp(PageSize, 1, 100);

            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            int? categoryId = null;
            if (!string.IsNullOrWhiteSpace(Category))
            {
                var catName = Category.Trim();
                categoryId = await _db.Categories
                    .AsNoTracking()
                    .Where(c => c.Name != null && c.Name.ToLower() == catName.ToLower())
                    .Select(c => (int?)c.Id)
                    .FirstOrDefaultAsync();
            }

            var query = new ProductQueryParams
            {
                Page = Page,
                PageSize = PageSize,
                SortBy = SortBy,
                Keyword = Keyword,
                CategoryId = categoryId,
                NewWithinDays = NewWithinDays
            };

            var home = await _productService.GetHomeAsync(query);

            // Normalize ảnh: service trả file name, controller trả full URL như trước
            void NormalizeThumb(IEnumerable<ProductListItemDto> items)
            {
                foreach (var x in items)
                {
                    if (string.IsNullOrWhiteSpace(x.ThumbnailUrl)) continue;
                    if (Uri.TryCreate(x.ThumbnailUrl, UriKind.Absolute, out _)) continue;

                    x.ThumbnailUrl = $"{baseUrl}/images/{x.ThumbnailUrl}";
                }
            }

            NormalizeThumb(home.Featured);
            NormalizeThumb(home.NewArrivals);
            NormalizeThumb(home.All.Items);

            // Giữ nguyên shape response cũ (featured/newArrivals/all.page...)
            return Ok(new
            {
                featured = home.Featured.Select(x => new
                {
                    id = x.Id,
                    name = x.Name,
                    price = x.Price,
                    originalPrice = x.OriginalPrice,

                    promotionId = x.AppliedPromotionId,
                    promotionName = x.AppliedPromotionName,
                    discountType = x.AppliedDiscountType,
                    discountValue = x.AppliedDiscountValue,

                    image = x.ThumbnailUrl,
                    description = x.Description,
                    category = x.Category,
                    createAt = x.CreatedAt,
                    quantity = x.Stock
                }),
                newArrivals = home.NewArrivals.Select(x => new
                {
                    id = x.Id,
                    name = x.Name,
                    price = x.Price,
                    originalPrice = x.OriginalPrice,

                    promotionId = x.AppliedPromotionId,
                    promotionName = x.AppliedPromotionName,
                    discountType = x.AppliedDiscountType,
                    discountValue = x.AppliedDiscountValue,

                    image = x.ThumbnailUrl,
                    description = x.Description,
                    category = x.Category,
                    createAt = x.CreatedAt,
                    quantity = x.Stock
                }),
                all = new
                {
                    page = home.All.Page,
                    pageSize = home.All.PageSize,
                    totalItems = home.All.TotalItems,
                    totalPages = (int)Math.Ceiling((double)home.All.TotalItems / home.All.PageSize),
                    items = home.All.Items.Select(x => new
                    {
                        id = x.Id,
                        name = x.Name,
                        price = x.Price,
                        originalPrice = x.OriginalPrice,

                        promotionId = x.AppliedPromotionId,
                        promotionName = x.AppliedPromotionName,
                        discountType = x.AppliedDiscountType,
                        discountValue = x.AppliedDiscountValue,

                        image = x.ThumbnailUrl,
                        description = x.Description,
                        category = x.Category,
                        createAt = x.CreatedAt,
                        quantity = x.Stock
                    })
                }
            });
        }
    }
}
