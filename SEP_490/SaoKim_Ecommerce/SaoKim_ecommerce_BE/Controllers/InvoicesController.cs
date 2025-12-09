using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Drawing.Exceptions;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services;
using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("api/[controller]")]
    public class InvoicesController : ControllerBase
    {
        private readonly SaoKimDBContext _db;
        private readonly IEmailService _emailService;

        public InvoicesController(SaoKimDBContext db, IEmailService emailService)
        {
            _db = db;
            _emailService = emailService;
        }

        // GET /api/invoices
        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] InvoiceQuery q)
        {
            q.Page = Math.Max(1, q.Page);
            q.PageSize = Math.Clamp(q.PageSize, 1, 100);

            var baseQuery = _db.Set<Invoice>().AsNoTracking();

            if (!string.IsNullOrWhiteSpace(q.Q))
            {
                var term = $"%{q.Q.Trim()}%";
                baseQuery = baseQuery.Where(i =>
                    EF.Functions.ILike(i.Code, term) ||
                    EF.Functions.ILike(i.CustomerName ?? "", term) ||
                    EF.Functions.ILike(i.Email ?? "", term) ||
                    EF.Functions.ILike(i.Phone ?? "", term));
            }

            if (!string.IsNullOrWhiteSpace(q.Status) &&
                Enum.TryParse<InvoiceStatus>(q.Status, true, out var st))
            {
                baseQuery = baseQuery.Where(i => i.Status == st);
            }

            var desc = string.Equals(q.SortDir, "desc", StringComparison.OrdinalIgnoreCase);
            baseQuery = (q.SortBy ?? "created").ToLower() switch
            {
                "code" => desc ? baseQuery.OrderByDescending(i => i.Code) : baseQuery.OrderBy(i => i.Code),
                "total" => desc ? baseQuery.OrderByDescending(i => i.Total) : baseQuery.OrderBy(i => i.Total),
                "status" => desc ? baseQuery.OrderByDescending(i => i.Status) : baseQuery.OrderBy(i => i.Status),
                _ => desc ? baseQuery.OrderByDescending(i => i.CreatedAt) : baseQuery.OrderBy(i => i.CreatedAt),
            };

            var total = await baseQuery.CountAsync();

            var items = await baseQuery
                .Skip((q.Page - 1) * q.PageSize)
                .Take(q.PageSize)
                .Select(i => new InvoiceListItemDto
                {
                    Id = i.Id,
                    Code = i.Code,
                    Customer = i.CustomerName,
                    Email = i.Email,
                    Phone = i.Phone,
                    Total = i.Total,
                    Status = i.Status.ToString(),
                    Created = i.CreatedAt,
                    HasPdf = i.PdfFileName != null,
                    PdfOriginalName = i.PdfOriginalName,
                    PdfUploadedAt = i.PdfUploadedAt
                })
                .ToListAsync();

            return Ok(new
            {
                items,
                page = q.Page,
                pageSize = q.PageSize,
                total,
                totalPages = (int)Math.Ceiling(total / (double)q.PageSize)
            });
        }

        // GET /api/invoices/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var inv = await _db.Set<Invoice>()
                .Include(i => i.Items)
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == id);

            if (inv == null) return NotFound();

            var dto = new InvoiceDetailDto
            {
                Id = inv.Id,
                Code = inv.Code,
                Customer = inv.CustomerName,
                Email = inv.Email,
                Phone = inv.Phone,
                Subtotal = inv.Subtotal,
                Discount = inv.Discount,
                Tax = inv.Tax,
                Total = inv.Total,
                Status = inv.Status.ToString(),
                Created = inv.CreatedAt,
                ShippingFee = inv.ShippingFee,
                Items = inv.Items.Select(x => new InvoiceItemDto
                {
                    ProductName = x.ProductName,
                    Uom = x.Uom,
                    Qty = x.Quantity,
                    UnitPrice = x.UnitPrice,
                    LineTotal = x.LineTotal
                }).ToList()
            };

            return Ok(dto);
        }

        // PUT /api/invoices/{id}/status
        [HttpPut("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateInvoiceStatusDto body)
        {
            var inv = await _db.Set<Invoice>().FirstOrDefaultAsync(i => i.Id == id);
            if (inv == null) return NotFound();

            if (!Enum.TryParse<InvoiceStatus>(body.Status, true, out var st))
                return BadRequest(new { message = "Invalid status" });

            inv.Status = st;
            await _db.SaveChangesAsync();
            return Ok(new { message = "Updated" });
        }

        // DELETE /api/invoices/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, [FromServices] IWebHostEnvironment env)
        {
            var inv = await _db.Set<Invoice>().FirstOrDefaultAsync(i => i.Id == id);
            if (inv == null) return NotFound();

            if (!string.IsNullOrEmpty(inv.PdfFileName))
            {
                var folder = Path.Combine(env.WebRootPath ?? "wwwroot", "invoices");
                var path = Path.Combine(folder, inv.PdfFileName);
                if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
            }

            _db.Remove(inv);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Deleted" });
        }

        // POST /api/invoices/{id}/generate-pdf
        [HttpPost("{id:int}/generate-pdf")]
        public async Task<IActionResult> GeneratePdf(int id, [FromServices] IWebHostEnvironment env)
        {
            var inv = await _db.Set<Invoice>()
                               .Include(x => x.Items)
                               .FirstOrDefaultAsync(x => x.Id == id);
            if (inv == null) return NotFound();

            if (inv.Status != InvoiceStatus.Paid)
                return BadRequest(new { message = "Invoice must be Paid before generating PDF." });

            if (inv.Total <= 0)
            {
                ApplyDefaultTax(inv);
            }

            var folder = Path.Combine(env.WebRootPath ?? "wwwroot", "invoices");
            Directory.CreateDirectory(folder);

            var fileName = $"Invoice_{inv.Code}_{DateTime.UtcNow:yyyyMMddHHmmss}.pdf";
            var path = Path.Combine(folder, fileName);

            string storeName = "SAO KIM LIGHTNING";
            string storeAddr = "Email: saokim@gmail.com";
            string storePhone = "ĐT: 0133 878 120";
            string invoiceTitle = "HÓA ĐƠN BÁN HÀNG";
            string sellLine = "Mặt hàng bán: Sao Kim Lightning";

            string customerSignName = string.IsNullOrWhiteSpace(inv.CustomerName)
                ? "Khách hàng"
                : inv.CustomerName.Trim();
            string sellerSignName = "         ";

            var logoPath = Path.Combine(env.WebRootPath ?? "wwwroot", "images", "saokim-logo.jpg");

            var items = (inv.Items ?? new List<InvoiceItem>()).ToList();
            for (int i = items.Count; i < 10; i++)
                items.Add(new InvoiceItem { ProductName = "", Quantity = 0, UnitPrice = 0, LineTotal = 0 });

            static string VnMoney(decimal v) =>
                string.Format(new System.Globalization.CultureInfo("vi-VN"), "{0:#,0} đ", v);

            byte[] pdfBytes;

            try
            {
                pdfBytes = QuestPDF.Fluent.Document.Create(container =>
                {
                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(25);
                        page.DefaultTextStyle(TextStyle.Default.FontSize(11));

                        page.Content().Column(col =>
                        {
                            col.Item().Row(row =>
                            {
                                row.ConstantItem(160).AlignMiddle().Column(c =>
                                {
                                    if (System.IO.File.Exists(logoPath))
                                    {
                                        c.Item()
                                         .Height(30)     
                                         .Image(logoPath)
                                         .FitHeight();
                                    }

                                    c.Item().PaddingTop(6);
                                    c.Item().Text(storeName).SemiBold().FontSize(12);
                                    c.Item().Text(storeAddr).FontSize(10);
                                    c.Item().Text(storePhone).FontSize(10);
                                });

                                row.RelativeItem().AlignMiddle().Column(c =>
                                {
                                    c.Item().AlignCenter()
                                           .Text(invoiceTitle)
                                           .SemiBold()
                                           .FontSize(18);

                                    c.Item().AlignCenter()
                                           .Text(sellLine)
                                           .FontSize(11);
                                });

                                row.RelativeItem().AlignMiddle().AlignRight().Column(c =>
                                {
                                    c.Item().Text($"Tên khách hàng: {inv.CustomerName ?? ""}");
                                    c.Item().Text($"Điện thoại: {inv.Phone ?? ""}");
                                    c.Item().Text($"Email: {inv.Email ?? ""}");
                                });
                            });

                            col.Item().PaddingTop(10);

                            col.Item().Table(t =>
                            {
                                t.ColumnsDefinition(c =>
                                {
                                    c.ConstantColumn(35);
                                    c.RelativeColumn(3);
                                    c.RelativeColumn(1);
                                    c.RelativeColumn(1);
                                    c.RelativeColumn(1);
                                });

                                void TH(string txt) => t.Cell().Border(0.8f).Padding(6).AlignCenter().Text(txt).SemiBold();
                                TH("STT"); TH("TÊN HÀNG"); TH("SỐ LƯỢNG"); TH("ĐƠN GIÁ"); TH("THÀNH TIỀN");

                                int idx = 1;
                                foreach (var it in items)
                                {
                                    t.Cell().Border(0.5f).Padding(6).AlignCenter()
                                        .Text((it.ProductName?.Length > 0) ? (idx++).ToString() : "");
                                    t.Cell().Border(0.5f).Padding(6).Text(it.ProductName ?? "");
                                    t.Cell().Border(0.5f).Padding(6).AlignCenter()
                                        .Text(it.Quantity == 0 ? "" : $"{it.Quantity:0.##}");
                                    t.Cell().Border(0.5f).Padding(6).AlignRight()
                                        .Text(it.UnitPrice == 0 ? "" : VnMoney(it.UnitPrice));
                                    t.Cell().Border(0.5f).Padding(6).AlignRight()
                                        .Text(it.LineTotal == 0 ? "" : VnMoney(it.LineTotal));
                                }

                                t.Cell().Border(0.8f).Padding(6).Text("CỘNG").SemiBold().AlignCenter();
                                t.Cell().Border(0.8f).Padding(6).Text("");
                                t.Cell().Border(0.8f).Padding(6).Text("");
                                t.Cell().Border(0.8f).Padding(6).Text("");
                                t.Cell().Border(0.8f).Padding(6).AlignRight().Text(VnMoney(inv.Subtotal)).SemiBold();
                            });

                            col.Item().PaddingTop(8);

                            col.Item().Row(r =>
                            {
                                r.RelativeItem();
                                r.ConstantItem(260).Column(s =>
                                {
                                    void Line(string label, string value, bool bold = false)
                                    {
                                        s.Item().Row(x =>
                                        {
                                            x.RelativeItem().Text(label);
                                            var t = x.RelativeItem().AlignRight().Text(value);
                                            if (bold) t.SemiBold();
                                        });
                                    }

                                    Line("Tạm tính:", VnMoney(inv.Subtotal));
                                    if (inv.Discount > 0) Line("Giảm giá:", "-" + VnMoney(inv.Discount));
                                    if (inv.ShippingFee > 0)
                                        Line("Phí ship:", VnMoney(inv.ShippingFee));
                                    Line("Thuế:", VnMoney(inv.Tax));
                                    Line("Tổng cộng:", VnMoney(inv.Total), true);
                                });
                            });

                            col.Item().PaddingTop(16);
                            col.Item().AlignRight()
                                .Text($"Ngày {inv.CreatedAt:dd} tháng {inv.CreatedAt:MM} năm {inv.CreatedAt:yyyy}");

                            col.Item().PaddingTop(30);
                            col.Item().Row(r =>
                            {
                                r.RelativeItem().AlignCenter().Column(c =>
                                {
                                    c.Item().Text("KHÁCH HÀNG").SemiBold();
                                    c.Item().Height(60);
                                    c.Item().Text(customerSignName).Italic();
                                });

                                r.RelativeItem().AlignCenter().Column(c =>
                                {
                                    c.Item().Text("NGƯỜI BÁN HÀNG").SemiBold();
                                    c.Item().Height(60);
                                    c.Item().Text(sellerSignName).Italic();
                                });
                            });
                        });
                    });
                }).GeneratePdf();
            }
            catch (DocumentLayoutException ex)
            {
                return StatusCode(500, new { message = "Lỗi layout khi tạo PDF.", detail = ex.Message });
            }

            await System.IO.File.WriteAllBytesAsync(path, pdfBytes);

            inv.PdfFileName = fileName;
            inv.PdfOriginalName = fileName;
            inv.PdfUploadedAt = DateTime.UtcNow;
            inv.PdfSize = pdfBytes.LongLength;

            await _db.SaveChangesAsync();

            return Ok(new { message = "PDF generated successfully." });
        }




        private void ApplyDefaultTax(Invoice inv)
        {
            var baseAmount = inv.Subtotal - inv.Discount;
            if (baseAmount < 0) baseAmount = 0;

            inv.Tax = Math.Round(baseAmount * 0.10m, 0, MidpointRounding.AwayFromZero);

            inv.Total = baseAmount + inv.Tax + inv.ShippingFee;
        }

        // GET /api/invoices/{id}/pdf
        [HttpGet("{id:int}/pdf")]
        public async Task<IActionResult> DownloadPdf(int id, [FromServices] IWebHostEnvironment env, [FromQuery] bool inline = false)
        {
            var inv = await _db.Set<Invoice>().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (inv == null) return NotFound();
            if (string.IsNullOrEmpty(inv.PdfFileName)) return NotFound();

            var path = Path.Combine(env.WebRootPath ?? "wwwroot", "invoices", inv.PdfFileName);
            if (!System.IO.File.Exists(path)) return NotFound();

            var fileName = string.IsNullOrEmpty(inv.PdfOriginalName) ? $"{inv.Code}.pdf" : inv.PdfOriginalName;

            if (inline)
            {
                Response.Headers["Content-Disposition"] = $"inline; filename=\"{fileName}\"";
                return PhysicalFile(path, "application/pdf");
            }

            return PhysicalFile(path, "application/pdf", fileName);
        }

        // DELETE /api/invoices/{id}/pdf
        [HttpDelete("{id:int}/pdf")]
        public async Task<IActionResult> DeletePdf(int id, [FromServices] IWebHostEnvironment env)
        {
            var inv = await _db.Set<Invoice>().FirstOrDefaultAsync(x => x.Id == id);
            if (inv == null) return NotFound();

            if (!string.IsNullOrEmpty(inv.PdfFileName))
            {
                var folder = Path.Combine(env.WebRootPath ?? "wwwroot", "invoices");
                var path = Path.Combine(folder, inv.PdfFileName);
                if (System.IO.File.Exists(path)) System.IO.File.Delete(path);

                inv.PdfFileName = null;
                inv.PdfOriginalName = null;
                inv.PdfSize = null;
                inv.PdfUploadedAt = null;
                await _db.SaveChangesAsync();
            }

            return Ok(new { message = "Deleted" });
        }

        // POST /api/invoices/{id}/send-email
        [HttpPost("{id:int}/send-email")]
        public async Task<IActionResult> SendInvoiceEmail(int id)
        {
            var inv = await _db.Set<Invoice>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (inv == null)
                return NotFound(new { message = "Invoice not found" });

            if (string.IsNullOrWhiteSpace(inv.Email))
                return BadRequest(new { message = "Customer email is empty" });

            if (inv.Status != InvoiceStatus.Paid)
                return BadRequest(new { message = "Invoice must be Paid before sending email." });

            if (string.IsNullOrEmpty(inv.PdfFileName))
                return BadRequest(new { message = "PDF not generated yet." });

            var pdfUrl = $"{Request.Scheme}://{Request.Host}/api/invoices/{inv.Id}/pdf";

            var subject = $"Hóa đơn {inv.Code} từ Sao Kim Lighting";
            var body = $@"
Chào {inv.CustomerName ?? "quý khách"},

Cảm ơn bạn đã mua hàng tại Sao Kim Lighting.

Thông tin hóa đơn:
- Mã hóa đơn: {inv.Code}
- Tổng tiền: {inv.Total:#,0} đ
- Ngày tạo: {inv.CreatedAt:dd/MM/yyyy HH:mm}

Bạn có thể xem hoặc tải hóa đơn tại đường dẫn:
{pdfUrl}

Nếu có bất kỳ thắc mắc nào, vui lòng phản hồi email này.

Trân trọng,
Sao Kim Lighting
";

            await _emailService.SendAsync(inv.Email, subject, body);

            return Ok(new { message = "Invoice email sent" });
        }

    }
}