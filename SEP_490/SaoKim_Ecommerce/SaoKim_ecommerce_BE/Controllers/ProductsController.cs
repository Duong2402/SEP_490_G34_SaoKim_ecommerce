using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        private readonly IWebHostEnvironment _env;

        // trạng thái "đang luân chuyển" lưu trong DB
        private const string ProductStatusProcessing = "Processing";

        public ProductsController(SaoKimDBContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
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
            [FromQuery] string? sortBy = "id",
            [FromQuery] string? sortDir = "asc")
        {
            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 10;

            IQueryable<Product> productQuery = _db.Products.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = $"%{q.Trim()}%";

                productQuery = productQuery.Where(p =>
                    EF.Functions.ILike(p.ProductName, term) ||
                    EF.Functions.ILike(p.ProductCode, term) ||
                    p.ProductDetails.Any(d => d.Category != null &&
                                              EF.Functions.ILike(d.Category.Name, term))
                );
            }

            var total = await productQuery.CountAsync();

            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            var query =
                productQuery
                    .Select(p => new
                    {
                        Product = p,
                        Detail = p.ProductDetails
                            .OrderByDescending(d => d.Id)
                            .FirstOrDefault()
                    });

            var sortKey = (sortBy ?? "id").ToLowerInvariant();
            var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);

            var ordered = sortKey switch
            {
                "name" => desc
                    ? query.OrderByDescending(x => x.Product.ProductName)
                    : query.OrderBy(x => x.Product.ProductName),

                "sku" => desc
                    ? query.OrderByDescending(x => x.Product.ProductCode)
                    : query.OrderBy(x => x.Product.ProductCode),

                "category" => desc
                    ? query.OrderByDescending(x => x.Detail != null && x.Detail.Category != null
                        ? x.Detail.Category.Name
                        : null)
                    : query.OrderBy(x => x.Detail != null && x.Detail.Category != null
                        ? x.Detail.Category.Name
                        : null),

                "price" => desc
                    ? query.OrderByDescending(x => x.Detail != null ? x.Detail.Price : 0)
                    : query.OrderBy(x => x.Detail != null ? x.Detail.Price : 0),

                "stock" => desc
                    ? query.OrderByDescending(x => x.Detail != null ? x.Detail.Quantity : 0)
                    : query.OrderBy(x => x.Detail != null ? x.Detail.Quantity : 0),

                "status" => desc
                    ? query.OrderByDescending(x => x.Detail != null ? x.Detail.Status : null)
                    : query.OrderBy(x => x.Detail != null ? x.Detail.Status : null),

                "created" => desc
                    ? query.OrderByDescending(x => x.Detail != null ? x.Detail.CreateAt : null)
                    : query.OrderBy(x => x.Detail != null ? x.Detail.CreateAt : null),

                _ => desc
                    ? query.OrderByDescending(x => x.Product.ProductID)
                    : query.OrderBy(x => x.Product.ProductID),
            };

            var items = await ordered
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    id = x.Product.ProductID,
                    sku = x.Product.ProductCode,
                    name = x.Product.ProductName,
                    category = x.Detail != null && x.Detail.Category != null
                        ? x.Detail.Category.Name
                        : null,
                    price = x.Detail != null ? x.Detail.Price : 0,
                    unit = x.Detail != null ? x.Detail.Unit : null,
                    stock = x.Detail != null ? x.Detail.Quantity : 0,
                    status = x.Detail != null ? x.Detail.Status : null,
                    created = x.Detail != null ? x.Detail.CreateAt : null,
                    image = x.Detail != null && x.Detail.Image != null
                        ? $"{baseUrl}/images/{x.Detail.Image}"
                        : null
                })
                .ToListAsync();

            var payload = new
            {
                items,
                page,
                pageSize,
                total,
                totalPages = (int)Math.Ceiling(total / (double)pageSize)
            };

            return Ok(ApiResponse<object>.Ok(payload));
        }

        // GET: /api/products/{id}
        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            var product = await _db.Products
                .AsNoTracking()
                .Where(p => p.ProductID == id)
                .Select(p => new
                {
                    Product = p,
                    Detail = p.ProductDetails
                        .OrderByDescending(d => d.Id)
                        .FirstOrDefault()
                })
                .Select(x => new
                {
                    id = x.Product.ProductID,
                    sku = x.Product.ProductCode,
                    name = x.Product.ProductName,
                    category = x.Detail != null && x.Detail.Category != null
                        ? x.Detail.Category.Name
                        : null,
                    price = x.Detail != null ? x.Detail.Price : 0,
                    stock = x.Detail != null ? x.Detail.Quantity : 0,
                    status = x.Detail != null ? x.Detail.Status : null,
                    created = x.Detail != null ? x.Detail.CreateAt : null,
                    unit = x.Detail != null ? x.Detail.Unit : null,
                    quantity = x.Detail != null ? x.Detail.Quantity : 0,
                    description = x.Detail != null ? x.Detail.Description : null,
                    supplier = x.Detail != null ? x.Detail.Supplier : null,
                    image = x.Detail != null && x.Detail.Image != null
                        ? $"{baseUrl}/images/{x.Detail.Image}"
                        : null,
                    note = x.Detail != null ? x.Detail.Note : null
                })
                .FirstOrDefaultAsync();

            if (product == null)
                return NotFound(new { message = "Product not found" });

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

            // cho phép 3 trạng thái
            var allowed = new[] { "Active", "Inactive", ProductStatusProcessing };

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

            var exists = await _db.Products.AnyAsync(p => p.ProductCode == model.Sku);
            if (exists)
                return Conflict(new { message = "Product code already exists" });

            var product = new Product
            {
                ProductCode = model.Sku,
                ProductName = model.Name
            };

            _db.Products.Add(product);
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

            product.ProductCode = model.Sku;
            product.ProductName = model.Name;

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
            detail.Unit = model.Unit;
            detail.Price = model.Price;
            detail.Quantity = model.Quantity;
            detail.Status = model.Active ? "Active" : "Inactive";
            detail.Description = model.Description;
            detail.Supplier = model.Supplier;
            detail.Note = model.Note;
            detail.UpdateAt = now;
            detail.UpdateBy = model.UpdateBy;

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

            return Ok(new { message = "Product updated successfully" });
        }

        // DELETE: /api/products/{id}
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Staff")]
        public async Task<IActionResult> Delete(int id)
        {
            var product = await _db.Products
                .Include(p => p.ProductDetails)
                .FirstOrDefaultAsync(p => p.ProductID == id);

            if (product == null)
                return NotFound(new { message = "Product not found" });

            var latestDetail = product.ProductDetails
                .OrderByDescending(d => d.Id)
                .FirstOrDefault();

            if (latestDetail != null &&
                string.Equals(latestDetail.Status, ProductStatusProcessing, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new
                {
                    message = "Sản phẩm đang ở trạng thái xử lý/luân chuyển, không được phép xóa."
                });
            }

            _db.Products.Remove(product);
            await _db.SaveChangesAsync();

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

            var cutoff = DateTime.UtcNow.AddDays(-NewWithinDays);
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            var productWithDetail = _db.Products
                .AsNoTracking()
                .Select(p => new
                {
                    Product = p,
                    Detail = p.ProductDetails
                        .OrderByDescending(d => d.Id)
                        .FirstOrDefault()
                });

            var featuredQuery = productWithDetail
                .Where(x =>
                    x.Detail != null &&
                    (x.Detail.Status == "Active" || x.Detail.Status == null) &&
                    x.Detail.Quantity > 0);

            var featured = await featuredQuery
                .OrderByDescending(x => x.Detail!.CreateAt)
                .Take(8)
                .Select(x => new
                {
                    id = x.Product.ProductID,
                    name = x.Product.ProductName,
                    price = x.Detail!.Price,
                    image = x.Detail.Image != null ? $"{baseUrl}/images/{x.Detail.Image}" : null,
                    description = x.Detail.Description,
                    category = x.Detail.Category != null ? x.Detail.Category.Name : null,
                    createAt = x.Detail.CreateAt,
                    quantity = x.Detail.Quantity
                })
                .ToListAsync();

            var newArrivalsQuery = productWithDetail
                .Where(x =>
                    x.Detail != null &&
                    (x.Detail.Status == "Active" || x.Detail.Status == null) &&
                    x.Detail.CreateAt >= cutoff);

            var newArrivals = await newArrivalsQuery
                .OrderByDescending(x => x.Detail!.CreateAt)
                .Take(12)
                .Select(x => new
                {
                    id = x.Product.ProductID,
                    name = x.Product.ProductName,
                    price = x.Detail!.Price,
                    image = x.Detail.Image != null ? $"{baseUrl}/images/{x.Detail.Image}" : null,
                    description = x.Detail.Description,
                    category = x.Detail.Category != null ? x.Detail.Category.Name : null,
                    createAt = x.Detail.CreateAt,
                    quantity = x.Detail.Quantity
                })
                .ToListAsync();

            var q = productWithDetail
                .Where(x =>
                    x.Detail != null &&
                    (x.Detail.Status == "Active" || x.Detail.Status == null));

            if (!string.IsNullOrWhiteSpace(Keyword))
            {
                var kw = Keyword.Trim();
                q = q.Where(x => x.Product.ProductName.Contains(kw));
            }

            if (!string.IsNullOrWhiteSpace(Category))
            {
                var catLower = Category.Trim().ToLower();
                q = q.Where(x =>
                    x.Detail!.Category != null &&
                    x.Detail.Category.Name.ToLower() == catLower);
            }

            var sortKey = (SortBy ?? "new").ToLowerInvariant();
            var sorted = q;

            if (sortKey == "price_asc")
            {
                sorted = sorted
                    .OrderBy(x => x.Detail!.Price)
                    .ThenByDescending(x => x.Detail!.CreateAt);
            }
            else if (sortKey == "price_desc")
            {
                sorted = sorted
                    .OrderByDescending(x => x.Detail!.Price)
                    .ThenByDescending(x => x.Detail!.CreateAt);
            }
            else
            {
                sorted = sorted
                    .OrderByDescending(x => x.Detail!.CreateAt);
            }

            var totalItems = await sorted.CountAsync();

            var items = await sorted
                .Skip((Page - 1) * PageSize)
                .Take(PageSize)
                .Select(x => new
                {
                    id = x.Product.ProductID,
                    name = x.Product.ProductName,
                    price = x.Detail!.Price,
                    image = x.Detail.Image != null ? $"{baseUrl}/images/{x.Detail.Image}" : null,
                    description = x.Detail.Description,
                    category = x.Detail.Category != null ? x.Detail.Category.Name : null,
                    createAt = x.Detail.CreateAt,
                    quantity = x.Detail.Quantity
                })
                .ToListAsync();

            return Ok(new
            {
                featured,
                newArrivals,
                all = new
                {
                    page = Page,
                    pageSize = PageSize,
                    totalItems,
                    totalPages = (int)Math.Ceiling((double)totalItems / PageSize),
                    items
                }
            });
        }
    }
}
