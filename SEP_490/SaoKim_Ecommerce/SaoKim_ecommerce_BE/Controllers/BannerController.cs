using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services;
using System;
using System.Threading.Tasks;

[ApiController]
[Route("api/banner")]
public class BannerController : ControllerBase
{
    private readonly IBannerService _bannerService;

    public BannerController(IBannerService bannerService)
    {
        _bannerService = bannerService;
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
    public async Task<IActionResult> GetAll()
    {
        var data = await _bannerService.GetAllAsync();
        return Ok(data);
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var banner = await _bannerService.GetByIdAsync(id);
        if (banner == null) return NotFound();
        return Ok(banner);
    }

    [HttpPost]
    // [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] Banner model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

         model.StartDate = NormalizeToUtc(model.StartDate);
         model.EndDate   = NormalizeToUtc(model.EndDate);

        var created = await _bannerService.CreateAsync(model);
        return Ok(created);
    }

    [HttpPut("{id:int}")]
    // [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] Banner model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        model.StartDate = NormalizeToUtc(model.StartDate);
        model.EndDate   = NormalizeToUtc(model.EndDate);

        var updated = await _bannerService.UpdateAsync(id, model);
        if (updated == null) return NotFound();

        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    // [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _bannerService.DeleteAsync(id);
        if (!ok) return NotFound();

        return Ok();
    }

    [HttpGet("stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GetStats()
    {
        var result = await _bannerService.GetStatsAsync(DateTime.UtcNow.Date);
        return Ok(new
        {
            activeBanners = result.ActiveBanners,
            expiringSoon = result.ExpiringSoon
        });
    }
}
