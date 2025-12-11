using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using System.Globalization;

namespace SaoKim_ecommerce_BE.Services
{
    public class InvoiceService : IInvoiceService
    {
        private readonly SaoKimDBContext _db;
        private readonly IEmailService _emailService;

        public InvoiceService(SaoKimDBContext db, IEmailService emailService)
        {
            _db = db;
            _emailService = emailService;
        }

        public async Task<PagedResult<InvoiceListItemDto>> GetListAsync(InvoiceQuery q)
        {
            q.Page = Math.Max(1, q.Page);
            q.PageSize = Math.Clamp(q.PageSize, 1, 100);

            var baseQuery = _db.Invoices.AsNoTracking();

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

            var desc = q.SortDir.Equals("desc", StringComparison.OrdinalIgnoreCase);

            baseQuery = q.SortBy?.ToLower() switch
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

            return new PagedResult<InvoiceListItemDto>
            {
                Page = q.Page,
                PageSize = q.PageSize,
                TotalItems = total,
                Items = items
            };
        }

        public async Task<InvoiceDetailDto?> GetByIdAsync(int id)
        {
            var inv = await _db.Invoices
                .Include(i => i.Items)
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == id);

            if (inv == null) return null;

            return new InvoiceDetailDto
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
        }

        public async Task UpdateStatusAsync(int id, string status)
        {
            var inv = await _db.Invoices.FirstOrDefaultAsync(i => i.Id == id)
                ?? throw new InvalidOperationException("Không tìm thấy hóa đơn");

            if (!Enum.TryParse<InvoiceStatus>(status, true, out var st))
                throw new InvalidOperationException("Trạng thái không hợp lệ");

            inv.Status = st;
            await _db.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var inv = await _db.Invoices.FirstOrDefaultAsync(i => i.Id == id)
                ?? throw new InvalidOperationException("Không tìm thấy hóa đơn");

            _db.Invoices.Remove(inv);
            await _db.SaveChangesAsync();
        }

        public async Task<byte[]> GeneratePdfAsync(int id, string folderPath)
        {
            var inv = await _db.Invoices.Include(i => i.Items)
                .FirstOrDefaultAsync(i => i.Id == id)
                ?? throw new InvalidOperationException("Không tìm thấy hóa đơn");

            if (inv.Status != InvoiceStatus.Paid)
                throw new InvalidOperationException("Hóa đơn phải ở trạng thái Đã thanh toán");

            ApplyTax(inv);

            Directory.CreateDirectory(folderPath);

            var fileName = $"Invoice_{inv.Code}_{DateTime.UtcNow:yyyyMMddHHmmss}.pdf";

            var bytes = BuildPdf(inv);

            await File.WriteAllBytesAsync(Path.Combine(folderPath, fileName), bytes);

            inv.PdfFileName = fileName;
            inv.PdfUploadedAt = DateTime.UtcNow;
            inv.PdfOriginalName = fileName;
            inv.PdfSize = bytes.Length;

            await _db.SaveChangesAsync();

            return bytes;
        }

        private byte[] BuildPdf(Invoice inv)
        {
            string Money(decimal v) =>
                string.Format(new CultureInfo("vi-VN"), "{0:#,0} đ", v);

            var items = inv.Items.ToList();
            while (items.Count < 10)
                items.Add(new InvoiceItem { ProductName = "" });

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(25);
                    page.DefaultTextStyle(TextStyle.Default.FontSize(11));

                    page.Content().Column(col =>
                    {
                        col.Item().Text($"HÓA ĐƠN BÁN HÀNG ({inv.Code})")
                           .SemiBold().FontSize(16);

                        col.Item().Text($"Khách hàng: {inv.CustomerName}");
                        col.Item().Text($"Điện thoại: {inv.Phone}");
                        col.Item().Text($"Email: {inv.Email}");

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

                            void H(string txt) => t.Cell().Border(1).Padding(5).AlignCenter().Text(txt).SemiBold();
                            H("STT"); H("Tên hàng"); H("SL"); H("Đơn giá"); H("Thành tiền");

                            int idx = 1;
                            foreach (var it in items)
                            {
                                t.Cell().Border(0.5f).Padding(5).Text(string.IsNullOrEmpty(it.ProductName) ? "" : (idx++).ToString());
                                t.Cell().Border(0.5f).Padding(5).Text(it.ProductName);
                                t.Cell().Border(0.5f).Padding(5).AlignCenter().Text(it.Quantity == 0 ? "" : it.Quantity.ToString());
                                t.Cell().Border(0.5f).Padding(5).AlignRight().Text(it.UnitPrice > 0 ? Money(it.UnitPrice) : "");
                                t.Cell().Border(0.5f).Padding(5).AlignRight().Text(it.LineTotal > 0 ? Money(it.LineTotal) : "");
                            }
                        });

                        col.Item().PaddingTop(15);

                        col.Item().Text($"Tạm tính: {Money(inv.Subtotal)}");
                        if (inv.Discount > 0)
                            col.Item().Text($"Giảm giá: -{Money(inv.Discount)}");
                        if (inv.ShippingFee > 0)
                            col.Item().Text($"Phí ship: {Money(inv.ShippingFee)}");

                        col.Item().Text($"Thuế: {Money(inv.Tax)}").SemiBold();
                        col.Item().Text($"Tổng cộng: {Money(inv.Total)}").SemiBold();
                    });
                });
            }).GeneratePdf();
        }

        public async Task<string?> GetPdfPathAsync(int id, string folder)
        {
            var inv = await _db.Invoices.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new InvalidOperationException("Không tìm thấy hóa đơn");

            if (string.IsNullOrEmpty(inv.PdfFileName)) return null;

            var path = Path.Combine(folder, inv.PdfFileName);
            return File.Exists(path) ? path : null;
        }

        public async Task DeletePdfAsync(int id, string folder)
        {
            var inv = await _db.Invoices.FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new InvalidOperationException("Không tìm thấy hóa đơn");

            if (!string.IsNullOrEmpty(inv.PdfFileName))
            {
                var full = Path.Combine(folder, inv.PdfFileName);
                if (File.Exists(full)) File.Delete(full);

                inv.PdfFileName = null;
                inv.PdfUploadedAt = null;
                inv.PdfOriginalName = null;
                inv.PdfSize = null;

                await _db.SaveChangesAsync();
            }
        }

        public async Task SendInvoiceEmailAsync(int id, string pdfUrl)
        {
            var inv = await _db.Invoices.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id)
                ?? throw new InvalidOperationException("Không tìm thấy hóa đơn");

            if (string.IsNullOrWhiteSpace(inv.Email))
                throw new InvalidOperationException("Hóa đơn không có email khách hàng");

            if (inv.Status != InvoiceStatus.Paid)
                throw new InvalidOperationException("Hóa đơn phải ở trạng thái Đã thanh toán");

            if (string.IsNullOrEmpty(inv.PdfFileName))
                throw new InvalidOperationException("Hóa đơn chưa có PDF");

            var subject = $"Hóa đơn {inv.Code} từ Sao Kim Lighting";

            var body = $@"
Chào {inv.CustomerName},

Thông tin hóa đơn:
- Mã: {inv.Code}
- Tổng tiền: {inv.Total:#,0} đ

Tải hóa đơn PDF:
{pdfUrl}

Cảm ơn bạn đã mua hàng.";

            await _emailService.SendAsync(inv.Email, subject, body);
        }

        private void ApplyTax(Invoice inv)
        {
            var baseAmt = Math.Max(inv.Subtotal - inv.Discount, 0);
            inv.Tax = Math.Round(baseAmt * 0.10m, 0);
            inv.Total = baseAmt + inv.Tax + inv.ShippingFee;
        }
    }
}
