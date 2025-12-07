using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using System;
using System.Linq;

[ApiController]
[Route("api/banner")]
public class BannerController : ControllerBase
{
    private readonly SaoKimDBContext _db;

    public BannerController(SaoKimDBContext db)
    {
        _db = db;
    }

    private static DateTime? NormalizeToUtc(DateTime? dt)
    {
        if (dt == null) return null;

        if (dt.Value.Kind == DateTimeKind.Utc)
            return dt;

        return DateTime.SpecifyKind(dt.Value, DateTimeKind.Utc);
    }

    [HttpGet]
    [AllowAnonymous]
    public IActionResult GetAll()
    {
        var data = _db.Banners
                      .OrderByDescending(x => x.CreatedAt)
                      .ToList();
        return Ok(data);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public IActionResult GetById(int id)
    {
        var banner = _db.Banners.Find(id);
        if (banner == null) return NotFound();
        return Ok(banner);
    }

    [HttpPost]
    [AllowAnonymous]
    public IActionResult Create([FromBody] Banner model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        model.CreatedAt = DateTime.UtcNow;

        model.StartDate = NormalizeToUtc(model.StartDate);
        model.EndDate = NormalizeToUtc(model.EndDate);

        _db.Banners.Add(model);
        _db.SaveChanges();
        return Ok(model);
    }

    [HttpPut("{id}")]
    [AllowAnonymous]
    public IActionResult Update(int id, [FromBody] Banner model)
    {
        var banner = _db.Banners.Find(id);
        if (banner == null) return NotFound();

        banner.Title = model.Title;
        banner.ImageUrl = model.ImageUrl;
        banner.LinkUrl = model.LinkUrl;
        banner.IsActive = model.IsActive;

        banner.StartDate = NormalizeToUtc(model.StartDate);
        banner.EndDate = NormalizeToUtc(model.EndDate);

        _db.SaveChanges();
        return Ok(banner);
    }

    [HttpDelete("{id}")]
    [AllowAnonymous]
    public IActionResult Delete(int id)
    {
        var banner = _db.Banners.Find(id);
        if (banner == null) return NotFound();

        _db.Banners.Remove(banner);
        _db.SaveChanges();
        return Ok();
    }

    [HttpGet("stats")]
    [AllowAnonymous]
    public IActionResult GetStats()
    {
        var today = DateTime.UtcNow.Date;

        var activeCount = _db.Banners
            .Where(b => b.IsActive && (b.EndDate == null || b.EndDate >= today))
            .Count();

        var expiringSoon = _db.Banners
            .Where(b => b.IsActive &&
                        b.EndDate != null &&
                        b.EndDate >= today &&
                        b.EndDate <= today.AddDays(7))
            .OrderBy(b => b.EndDate)
            .Select(b => new
            {
                b.Id,
                b.Title,
                b.ImageUrl,
                b.LinkUrl,
                b.IsActive,
                b.StartDate,
                b.EndDate
            })
            .ToList();

        return Ok(new
        {
            activeBanners = activeCount,
            expiringSoon = expiringSoon
        });
    }
}
