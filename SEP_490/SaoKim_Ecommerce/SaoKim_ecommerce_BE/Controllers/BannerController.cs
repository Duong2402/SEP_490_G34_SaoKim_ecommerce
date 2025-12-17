using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services;

[ApiController]
[Route("api/banner")]
public class BannerController : ControllerBase
{
    private readonly IBannerService _bannerService;
    private readonly IWebHostEnvironment _env;

    public BannerController(IBannerService bannerService, IWebHostEnvironment env)
    {
        _bannerService = bannerService;
        _env = env;
    }

    private static DateTime? NormalizeToUtc(DateTime? dt)
    {
        if (dt == null) return null;
        if (dt.Value.Kind == DateTimeKind.Utc) return dt.Value;
        if (dt.Value.Kind == DateTimeKind.Local) return dt.Value.ToUniversalTime();
        return DateTime.SpecifyKind(dt.Value, DateTimeKind.Local).ToUniversalTime();
    }

    private string? ToAbsoluteUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return url;

        if (Uri.TryCreate(url, UriKind.Absolute, out _)) return url;

        if (!url.StartsWith("/")) url = "/" + url;

        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        return baseUrl + url;
    }

    private async Task<string?> SaveBannerFileAsync(IFormFile? file)
    {
        if (file == null || file.Length == 0) return null;

        var uploadsFolder = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", "banners");
        Directory.CreateDirectory(uploadsFolder);

        var ext = Path.GetExtension(file.FileName);
        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        return $"/uploads/banners/{fileName}";
    }

    private void TryDeleteUploadedBannerFile(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return;

        if (Uri.TryCreate(imageUrl, UriKind.Absolute, out var abs))
            imageUrl = abs.AbsolutePath;

        if (!imageUrl.StartsWith("/uploads/banners/")) return;

        var fileName = imageUrl.Replace("/uploads/banners/", "");
        var path = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", "banners", fileName);

        if (System.IO.File.Exists(path))
            System.IO.File.Delete(path);
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var data = await _bannerService.GetAllAsync();

        foreach (var b in data)
            b.ImageUrl = ToAbsoluteUrl(b.ImageUrl);

        return Ok(data);
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var banner = await _bannerService.GetByIdAsync(id);
        if (banner == null) return NotFound();

        banner.ImageUrl = ToAbsoluteUrl(banner.ImageUrl);
        return Ok(banner);
    }

    [HttpPost]
    [AllowAnonymous]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Create([FromForm] BannerDTOs dto)
    {
        var imageUrl = (dto.ImageUrl ?? "").Trim();

        if (dto.ImageFile != null)
        {
            var savedUrl = await SaveBannerFileAsync(dto.ImageFile);
            if (!string.IsNullOrEmpty(savedUrl))
                imageUrl = savedUrl;
        }

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Vui lòng nhập tiêu đề" });

        if (string.IsNullOrWhiteSpace(imageUrl))
            return BadRequest(new { message = "Vui lòng chọn ảnh hoặc nhập URL ảnh" });

        var model = new Banner
        {
            Title = dto.Title.Trim(),
            ImageUrl = imageUrl,
            LinkUrl = string.IsNullOrWhiteSpace(dto.LinkUrl) ? null : dto.LinkUrl.Trim(),
            IsActive = dto.IsActive,
            StartDate = NormalizeToUtc(dto.StartDate),
            EndDate = NormalizeToUtc(dto.EndDate),
            CreatedAt = DateTime.UtcNow
        };

        var created = await _bannerService.CreateAsync(model);

        // Trả absolute để FE dùng ngay
        created.ImageUrl = ToAbsoluteUrl(created.ImageUrl);

        return Ok(created);
    }

    [HttpPut("{id:int}")]
    [AllowAnonymous]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Update(int id, [FromForm] BannerDTOs dto)
    {
        var existed = await _bannerService.GetByIdAsync(id);
        if (existed == null) return NotFound();

        var oldImageUrl = existed.ImageUrl;
        var imageUrl = (dto.ImageUrl ?? existed.ImageUrl ?? "").Trim();

        if (dto.ImageFile != null)
        {
            var savedUrl = await SaveBannerFileAsync(dto.ImageFile);
            if (!string.IsNullOrEmpty(savedUrl))
                imageUrl = savedUrl;
        }

        existed.Title = string.IsNullOrWhiteSpace(dto.Title)
            ? existed.Title
            : dto.Title.Trim();

        existed.ImageUrl = imageUrl;
        existed.LinkUrl = string.IsNullOrWhiteSpace(dto.LinkUrl) ? null : dto.LinkUrl.Trim();
        existed.IsActive = dto.IsActive;
        existed.StartDate = NormalizeToUtc(dto.StartDate);
        existed.EndDate = NormalizeToUtc(dto.EndDate);

        var updated = await _bannerService.UpdateAsync(id, existed);

        if (!string.Equals(oldImageUrl, existed.ImageUrl, StringComparison.OrdinalIgnoreCase))
            TryDeleteUploadedBannerFile(oldImageUrl);

        updated!.ImageUrl = ToAbsoluteUrl(updated.ImageUrl);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> Delete(int id)
    {
        var existed = await _bannerService.GetByIdAsync(id);
        if (existed == null) return NotFound();

        var ok = await _bannerService.DeleteAsync(id);
        if (!ok) return NotFound();

        TryDeleteUploadedBannerFile(existed.ImageUrl);
        return Ok();
    }

    [HttpGet("active")]
    [AllowAnonymous]
    public async Task<IActionResult> GetActive()
    {
        var nowUtc = DateTime.UtcNow;
        var data = await _bannerService.GetActiveAsync(nowUtc);

        foreach (var b in data)
            b.ImageUrl = ToAbsoluteUrl(b.ImageUrl);

        return Ok(data);
    }
}
