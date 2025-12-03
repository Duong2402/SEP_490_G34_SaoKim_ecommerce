using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;

[ApiController]
[Route("api/banner")]
public class BannerController : ControllerBase
{
    private readonly SaoKimDBContext _db;

    public BannerController(SaoKimDBContext db)
    {
        _db = db;
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
    //[Authorize(Roles = "Admin")]
    public IActionResult Create([FromBody] Banner model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        _db.Banners.Add(model);
        _db.SaveChanges();
        return Ok(model);
    }

    [HttpPut("{id}")]
    //[Authorize(Roles = "Admin")]
    public IActionResult Update(int id, [FromBody] Banner model)
    {
        var banner = _db.Banners.Find(id);
        if (banner == null) return NotFound();

        banner.Title = model.Title;
        banner.ImageUrl = model.ImageUrl;
        banner.LinkUrl = model.LinkUrl;
        banner.IsActive = model.IsActive;

        _db.SaveChanges();
        return Ok(banner);
    }

    [HttpDelete("{id}")]
    //[Authorize(Roles = "Admin")]
    public IActionResult Delete(int id)
    {
        var banner = _db.Banners.Find(id);
        if (banner == null) return NotFound();

        _db.Banners.Remove(banner);
        _db.SaveChanges();
        return Ok();
    }
}
