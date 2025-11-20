// Controllers/ProjectReportsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;

// Tránh xung đột với System.Threading.Tasks.TaskStatus
using TaskStatusEnum = SaoKim_ecommerce_BE.Entities.TaskStatus;

namespace SaoKim_ecommerce_BE.Controllers
{
    [ApiController]
    [Route("api/projects")]
    public class ProjectReportsController : ControllerBase
    {
        private readonly SaoKimDBContext _db;

        public ProjectReportsController(SaoKimDBContext db)
        {
            _db = db;
        }

        // GET: /api/projects/{id}/report  -> JSON
        [HttpGet("{id:int}/report")]
        public async Task<IActionResult> GetReportJson(int id)
        {
            var dto = await BuildReportAsync(id);
            if (dto == null)
                return NotFound(ApiResponse<string>.Fail("Project not found"));

            return Ok(ApiResponse<ProjectReportDto>.Ok(dto));
        }

        // GET: /api/projects/{id}/report/pdf  -> PDF file
        [HttpGet("{id:int}/report/pdf")]
        public async Task<IActionResult> GetReportPdf(int id)
        {
            var dto = await BuildReportAsync(id);
            if (dto == null)
                return NotFound(ApiResponse<string>.Fail("Project not found"));

            var pdf = GeneratePdf(dto);
            var fileName = $"ProjectReport_{dto.Code ?? dto.ProjectId.ToString()}.pdf";
            return File(pdf, "application/pdf", fileName);
        }

        private async Task<ProjectReportDto> BuildReportAsync(int projectId)
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

            int active = System.Math.Max(totalTasks - completed - delayed, 0);
            int progress = totalTasks > 0
                ? (int)System.Math.Round((completed * 100.0) / totalTasks, System.MidpointRounding.AwayFromZero)
                : 0;

            var issues = tasks
                .Where(t => (t.Days?.OrderBy(d => d.Date).LastOrDefault()?.Status ?? TaskStatusEnum.New) == TaskStatusEnum.Delayed)
                .Select(t => string.IsNullOrWhiteSpace(t.Name) ? $"Task #{t.Id}" : t.Name)
                .ToList();

            return new ProjectReportDto
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

        private byte[] GeneratePdf(ProjectReportDto dto)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            var culture = new CultureInfo("vi-VN");
            string Money(decimal v) => string.Format(culture, "{0:C0}", v);

            var doc = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(36);
                    page.Size(PageSizes.A4);
                    page.DefaultTextStyle(TextStyle.Default.FontSize(10));

                    page.Header().Row(row =>
                    {
                        row.RelativeItem().Text("Project Status Report").SemiBold().FontSize(16);
                        row.ConstantItem(160).AlignRight().Text($"{System.DateTime.Now:dd/MM/yyyy HH:mm}");
                    });

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
                                c.Item().Text($"SP {Money(dto.TotalProductAmount)} + CP {Money(dto.TotalOtherExpenses)}")
                                    .FontColor(Colors.Grey.Darken2);
                            });

                            grid.Item().Background(Colors.Grey.Lighten4).Padding(8).Column(c =>
                            {
                                c.Item().Text("Variance").SemiBold();
                                var color = dto.Variance < 0 ? Colors.Red.Medium : Colors.Green.Medium;
                                c.Item().Text(Money(dto.Variance)).FontSize(12).FontColor(color);
                                c.Item().Text(dto.Variance < 0 ? "Vượt ngân sách" : "Còn trong ngân sách")
                                    .FontColor(Colors.Grey.Darken2);
                            });
                        });

                        // Financial Details
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

                            grid.Item().Background(Colors.White).Border(0.5f).Padding(8).Column(c =>
                            {
                                c.Item().Text("Profit (approx)").SemiBold();
                                var color = dto.ProfitApprox < 0 ? Colors.Red.Medium : Colors.Black;
                                c.Item().Text(Money(dto.ProfitApprox)).FontSize(11).FontColor(color);
                                c.Item().Text("≈ Revenue − Other Expenses")
                                    .FontColor(Colors.Grey.Darken2);
                            });
                        });

                        // Progress & Issues
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
                                    .Padding(4).BorderBottom(1).BorderColor(Colors.Grey.Darken2);
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
