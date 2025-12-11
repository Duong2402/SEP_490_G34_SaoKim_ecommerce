using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services;
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
    //[Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] Banner model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var created = await _bannerService.CreateAsync(model);
        return Ok(created);
    }

    [HttpPut("{id:int}")]
    //[Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] Banner model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var updated = await _bannerService.UpdateAsync(id, model);
        if (updated == null) return NotFound();

        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    //[Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _bannerService.DeleteAsync(id);
        if (!ok) return NotFound();

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
