using System.Globalization;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using TaskStatusEnum = SaoKim_ecommerce_BE.Entities.TaskStatus;

namespace SaoKim_ecommerce_BE.Services
{
    public class ProjectReportsService : IProjectReportsService
    {
        private readonly SaoKimDBContext _db;

        public ProjectReportsService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<ProjectReportDTOs?> GetProjectReportAsync(int projectId)
        {
            var p = await _db.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == projectId);

            if (p == null) return null;

            var totalProductAmount = await _db.ProjectProducts
                .AsNoTracking()
                .Where(x => x.ProjectId == projectId)
                .SumAsync(x => (decimal?)x.Total) ?? 0m;

            var totalOtherExpenses = await _db.ProjectExpenses
                .AsNoTracking()
                .Where(x => x.ProjectId == projectId)
                .SumAsync(x => (decimal?)x.Amount) ?? 0m;

            var budget = p.Budget ?? 0m;
            var actualAllIn = totalProductAmount + totalOtherExpenses;
            var variance = budget - actualAllIn;
            var profitApprox = totalProductAmount - totalOtherExpenses;

            var tasks = await _db.TaskItems
                .AsNoTracking()
                .Where(t => t.ProjectId == projectId)
                .Include(t => t.Days)
                .ToListAsync();

            int totalTasks = tasks.Count;
            int completed = 0;
            int delayed = 0;

            foreach (var t in tasks)
            {
                var last = t.Days?.OrderBy(d => d.Date).LastOrDefault();
                var overall = last?.Status ?? TaskStatusEnum.New;
                if (overall == TaskStatusEnum.Done) completed++;
                if (overall == TaskStatusEnum.Delayed) delayed++;
            }

            int active = Math.Max(totalTasks - completed - delayed, 0);
            int progress = totalTasks > 0
                ? (int)Math.Round((completed * 100.0) / totalTasks, MidpointRounding.AwayFromZero)
                : 0;

            var issues = tasks
                .Where(t => (t.Days?.OrderBy(d => d.Date).LastOrDefault()?.Status ?? TaskStatusEnum.New)
                            == TaskStatusEnum.Delayed)
                .Select(t => string.IsNullOrWhiteSpace(t.Name) ? $"Task #{t.Id}" : t.Name)
                .ToList();

            return new ProjectReportDTOs
            {
                ProjectId = p.Id,
                Code = p.Code,
                Name = p.Name,
                CustomerName = p.CustomerName,
                Status = p.Status,
                StartDate = p.StartDate,
                EndDate = p.EndDate,
                Budget = budget,

                TotalProductAmount = totalProductAmount,
                TotalOtherExpenses = totalOtherExpenses,
                ActualAllIn = actualAllIn,
                Variance = variance,
                ProfitApprox = profitApprox,

                TaskCount = totalTasks,
                TaskCompleted = completed,
                TaskDelayed = delayed,
                TaskActive = active,
                ProgressPercent = progress,
                Issues = issues
            };
        }

        public async Task<byte[]?> GetProjectReportPdfAsync(int projectId)
        {
            var dto = await GetProjectReportAsync(projectId);
            if (dto == null) return null;

            return GeneratePdf(dto);
        }

        private byte[] GeneratePdf(ProjectReportDTOs dto)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            var culture = new CultureInfo("vi-VN");
            string Money(decimal v) => string.Format(culture, "{0:C0}", v);

            // Logo giống phiếu xuất
            var logoPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "saokim-logo.jpg");
            byte[]? logoBytes = null;
            if (File.Exists(logoPath))
                logoBytes = File.ReadAllBytes(logoPath);

            // thời gian in report (giữ form cũ)
            var printedAt = DateTime.Now;

            var doc = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(36);
                    page.Size(PageSizes.A4);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(TextStyle.Default.FontSize(10));

                    // ===== HEADER: giống file phiếu xuất (company header + logo) =====
                    page.Header().Element(header =>
                    {
                        header.ShowOnce().Column(col =>
                        {
                            col.Item().Row(row =>
                            {
                                row.Spacing(10);

                                row.ConstantItem(110).Height(60).Element(e =>
                                {
                                    if (logoBytes != null)
                                        e.Image(logoBytes);
                                });

                                row.RelativeItem().Column(c =>
                                {
                                    c.Item().Text("CÔNG TY TNHH THƯƠNG MẠI VÀ KỸ THUẬT SAO KIM")
                                        .SemiBold().FontSize(11);
                                    c.Item().Text("Số 40 ngõ 168 Nguyễn Xiển, P. Hạ Đình, Q. Thanh Xuân, TP. Hà Nội");
                                    c.Item().Text("VPĐD: B44-24 Khu B KĐT mới Gleximco, đường Lê Trọng Tấn, P. Dương Nội, Q. Hà Đông, TP. Hà Nội");
                                    c.Item().Text("Điện thoại: 0243.274.7089    Fax: 0243.274.7090");
                                    c.Item().Text("Website: www.ske.com.vn    Email: info@ske.com.vn");
                                    c.Item().Text("Tài khoản NH: 0909 222 5668 - Tại Ngân hàng Tiên Phong (TPBANK) - CN Trung Hòa");
                                });
                            });

                            col.Item().PaddingTop(10).AlignCenter()
                                .Text("BÁO CÁO TRẠNG THÁI DỰ ÁN")
                                .FontSize(16).SemiBold();

                            col.Item().AlignCenter().Text(text =>
                            {
                                text.Span($"In lúc: {printedAt:dd/MM/yyyy HH:mm}");
                            });

                            col.Item().PaddingTop(6).LineHorizontal(0.6f);
                        });
                    });

                    // ===== CONTENT: giữ nguyên form cũ của report project =====
                    page.Content().PaddingTop(8).Column(col =>
                    {
                        col.Item().Text($"{dto.Code ?? "-"} — {dto.Name}").Bold().FontSize(13);

                        col.Item().Text(txt =>
                        {
                            txt.Span("Khách hàng: ").SemiBold();
                            txt.Span(dto.CustomerName ?? "-");
                            txt.Span("    ·    Trạng thái: ").SemiBold();
                            txt.Span(dto.Status ?? "-");
                        });

                        col.Item().Text(txt =>
                        {
                            txt.Span("Thời gian: ").SemiBold();
                            var sd = dto.StartDate?.ToString("dd/MM/yyyy") ?? "-";
                            var ed = dto.EndDate?.ToString("dd/MM/yyyy") ?? "-";
                            txt.Span($"{sd} — {ed}");
                        });

                        col.Item().PaddingVertical(6).LineHorizontal(0.5f);

                        // Budget / Actual / Variance
                        col.Item().Grid(grid =>
                        {
                            grid.Columns(3);
                            grid.Spacing(8);

                            grid.Item().Background(Colors.Grey.Lighten4).Padding(8).Column(c =>
                            {
                                c.Item().Text("Budget").SemiBold();
                                c.Item().Text(Money(dto.Budget)).FontSize(12);
                            });

                            grid.Item().Background(Colors.Grey.Lighten4).Padding(8).Column(c =>
                            {
                                c.Item().Text("Actual (All-in)").SemiBold();
                                c.Item().Text(Money(dto.ActualAllIn)).FontSize(12);
                                c.Item()
                                    .Text($"SP {Money(dto.TotalProductAmount)} + CP {Money(dto.TotalOtherExpenses)}")
                                    .FontColor(Colors.Grey.Darken2);
                            });

                            grid.Item().Background(Colors.Grey.Lighten4).Padding(8).Column(c =>
                            {
                                c.Item().Text("Variance").SemiBold();
                                var color = dto.Variance < 0 ? Colors.Red.Medium : Colors.Green.Medium;
                                c.Item().Text(Money(dto.Variance)).FontSize(12).FontColor(color);
                                c.Item()
                                    .Text(dto.Variance < 0 ? "Vượt ngân sách" : "Còn trong ngân sách")
                                    .FontColor(Colors.Grey.Darken2);
                            });
                        });

                        // Revenue / Expenses (giữ như cũ)
                        col.Item().PaddingTop(6).Grid(grid =>
                        {
                            grid.Columns(3);
                            grid.Spacing(8);

                            grid.Item().Background(Colors.White).Border(0.5f).Padding(8).Column(c =>
                            {
                                c.Item().Text("Revenue (Products)").SemiBold();
                                c.Item().Text(Money(dto.TotalProductAmount)).FontSize(11);
                            });

                            grid.Item().Background(Colors.White).Border(0.5f).Padding(8).Column(c =>
                            {
                                c.Item().Text("Other Expenses").SemiBold();
                                c.Item().Text(Money(dto.TotalOtherExpenses)).FontSize(11);
                            });

                            // Ô thứ 3 bạn đang comment thì giữ nguyên
                        });

                        // Progress
                        col.Item().PaddingTop(8).Text("Progress & Milestones").SemiBold();

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(cols =>
                            {
                                cols.RelativeColumn(2);
                                cols.RelativeColumn(2);
                                cols.RelativeColumn(2);
                                cols.RelativeColumn(2);
                                cols.RelativeColumn(2);
                            });

                            table.Header(h =>
                            {
                                h.Cell().Element(CellHeader).Text("Total");
                                h.Cell().Element(CellHeader).Text("Completed");
                                h.Cell().Element(CellHeader).Text("Active");
                                h.Cell().Element(CellHeader).Text("Delayed");
                                h.Cell().Element(CellHeader).Text("Completion %");
                            });

                            table.Cell().Element(Cell).Text(dto.TaskCount.ToString());
                            table.Cell().Element(Cell).Text(dto.TaskCompleted.ToString());
                            table.Cell().Element(Cell).Text(dto.TaskActive.ToString());
                            table.Cell().Element(Cell).Text(dto.TaskDelayed.ToString());
                            table.Cell().Element(Cell).Text($"{dto.ProgressPercent}%");

                            static IContainer CellHeader(IContainer c)
                                => c.Background(Colors.Grey.Lighten3)
                                    .Padding(4)
                                    .BorderBottom(1)
                                    .BorderColor(Colors.Grey.Darken2);

                            static IContainer Cell(IContainer c) => c.Padding(4);
                        });

                        // Issues
                        col.Item().PaddingTop(8).Text("Issues (Delayed Tasks)").SemiBold();

                        if (dto.Issues != null && dto.Issues.Count > 0)
                        {
                            col.Item().Column(c =>
                            {
                                foreach (var name in dto.Issues)
                                    c.Item().Text($"• {name}");
                            });
                        }
                        else
                        {
                            col.Item().Text("Không có issue.").FontColor(Colors.Grey.Darken1);
                        }
                    });

                    // Footer giữ nguyên
                    page.Footer().AlignRight().Text(x =>
                    {
                        x.Span("Trang ");
                        x.CurrentPageNumber();
                        x.Span(" / ");
                        x.TotalPages();
                    });
                });
            });

            return doc.GeneratePdf();
        }

    }
}
