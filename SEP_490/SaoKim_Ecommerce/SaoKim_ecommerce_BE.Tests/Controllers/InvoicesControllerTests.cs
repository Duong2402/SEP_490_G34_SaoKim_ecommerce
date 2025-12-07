using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using QuestPDF.Infrastructure;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class FakeEmailService : IEmailService
    {
        public string LastTo { get; private set; }
        public string LastSubject { get; private set; }
        public string LastBody { get; private set; }

        public Task SendAsync(string to, string subject, string body)
        {
            LastTo = to;
            LastSubject = subject;
            LastBody = body;
            return Task.CompletedTask;
        }
    }

    public class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; }
        public IFileProvider ContentRootFileProvider { get; set; }
        public string ContentRootPath { get; set; }
        public string EnvironmentName { get; set; }
        public IFileProvider WebRootFileProvider { get; set; }
        public string WebRootPath { get; set; }
    }

    public class InvoicesControllerTests
    {
        static InvoicesControllerTests()
        {
            QuestPDF.Settings.License = LicenseType.Community;
        }

        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new SaoKimDBContext(options);
        }

        private InvoicesController CreateController(SaoKimDBContext db, IEmailService emailService)
        {
            var controller = new InvoicesController(db, emailService);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };
            return controller;
        }

        private FakeWebHostEnvironment CreateEnvWithTempRoot()
        {
            var root = Path.Combine(Path.GetTempPath(), "InvoicesTests_" + Guid.NewGuid());
            Directory.CreateDirectory(root);
            return new FakeWebHostEnvironment
            {
                WebRootPath = root
            };
        }

        [Fact]
        public async Task GetById_ReturnsNotFound_WhenMissing()
        {
            using var db = CreateDbContext();
            var email = new FakeEmailService();
            var controller = CreateController(db, email);

            var result = await controller.GetById(999);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task UpdateStatus_UpdatesInvoiceStatus_WhenValid()
        {
            using var db = CreateDbContext();
            var inv = new Invoice
            {
                Code = "INV001",
                Status = InvoiceStatus.Pending,
                Total = 100,
                Subtotal = 100,
                CreatedAt = DateTime.UtcNow
            };
            db.Invoices.Add(inv);
            await db.SaveChangesAsync();

            var email = new FakeEmailService();
            var controller = CreateController(db, email);
            var body = new UpdateInvoiceStatusDto { Status = "Paid" };

            var result = await controller.UpdateStatus(inv.Id, body);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Equal("Updated", ok.Value.GetType().GetProperty("message")?.GetValue(ok.Value));
            var updated = await db.Invoices.FirstAsync(x => x.Id == inv.Id);
            Assert.Equal(InvoiceStatus.Paid, updated.Status);
        }

        [Fact]
        public async Task UpdateStatus_ReturnsBadRequest_WhenInvalidStatus()
        {
            using var db = CreateDbContext();
            var inv = new Invoice
            {
                Code = "INV001",
                Status = InvoiceStatus.Pending,
                Total = 100,
                Subtotal = 100,
                CreatedAt = DateTime.UtcNow
            };
            db.Invoices.Add(inv);
            await db.SaveChangesAsync();

            var email = new FakeEmailService();
            var controller = CreateController(db, email);
            var body = new UpdateInvoiceStatusDto { Status = "Xxx" };

            var result = await controller.UpdateStatus(inv.Id, body);

            var bad = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Invalid status", bad.Value.GetType().GetProperty("message")?.GetValue(bad.Value));
        }

        [Fact]
        public async Task UpdateStatus_ReturnsNotFound_WhenMissing()
        {
            using var db = CreateDbContext();
            var email = new FakeEmailService();
            var controller = CreateController(db, email);
            var body = new UpdateInvoiceStatusDto { Status = "Paid" };

            var result = await controller.UpdateStatus(999, body);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task Delete_RemovesInvoiceAndPdfFile()
        {
            using var db = CreateDbContext();
            var env = CreateEnvWithTempRoot();
            var fileName = "test.pdf";
            var folder = Path.Combine(env.WebRootPath, "invoices");
            Directory.CreateDirectory(folder);
            var path = Path.Combine(folder, fileName);
            await File.WriteAllTextAsync(path, "dummy");

            var inv = new Invoice
            {
                Code = "INV001",
                Status = InvoiceStatus.Paid,
                Total = 100,
                Subtotal = 100,
                CreatedAt = DateTime.UtcNow,
                PdfFileName = fileName
            };
            db.Invoices.Add(inv);
            await db.SaveChangesAsync();

            var email = new FakeEmailService();
            var controller = CreateController(db, email);

            var result = await controller.Delete(inv.Id, env);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Equal("Deleted", ok.Value.GetType().GetProperty("message")?.GetValue(ok.Value));
            Assert.False(await db.Invoices.AnyAsync(x => x.Id == inv.Id));
            Assert.False(File.Exists(path));
        }

        [Fact]
        public async Task Delete_ReturnsNotFound_WhenMissing()
        {
            using var db = CreateDbContext();
            var env = CreateEnvWithTempRoot();
            var email = new FakeEmailService();
            var controller = CreateController(db, email);

            var result = await controller.Delete(999, env);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task GeneratePdf_ReturnsBadRequest_WhenNotPaid()
        {
            using var db = CreateDbContext();
            var env = CreateEnvWithTempRoot();
            var inv = new Invoice
            {
                Code = "INV001",
                Status = InvoiceStatus.Pending,
                Total = 100,
                Subtotal = 100,
                CreatedAt = DateTime.UtcNow,
                Items = new List<InvoiceItem>()
            };
            db.Invoices.Add(inv);
            await db.SaveChangesAsync();

            var email = new FakeEmailService();
            var controller = CreateController(db, email);

            var result = await controller.GeneratePdf(inv.Id, env);

            var bad = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("Invoice must be Paid before generating PDF.", bad.Value.GetType().GetProperty("message")?.GetValue(bad.Value));
        }

        [Fact]
        public async Task GeneratePdf_CreatesPdfAndUpdatesFields_WhenPaid()
        {
            using var db = CreateDbContext();
            var env = CreateEnvWithTempRoot();
            var inv = new Invoice
            {
                Code = "INV001",
                Status = InvoiceStatus.Paid,
                Subtotal = 100,
                Discount = 0,
                Tax = 0,
                Total = 100,
                CreatedAt = DateTime.UtcNow,
                CustomerName = "Alice",
                Phone = "123",
                Email = "a@example.com",
                Items = new List<InvoiceItem>
                {
                    new InvoiceItem
                    {
                        ProductName = "Prod1",
                        Quantity = 2,
                        UnitPrice = 50,
                        LineTotal = 100,
                        Uom = "pcs"
                    }
                }
            };
            db.Invoices.Add(inv);
            await db.SaveChangesAsync();

            var email = new FakeEmailService();
            var controller = CreateController(db, email);

            var result = await controller.GeneratePdf(inv.Id, env);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Equal("PDF generated successfully.", ok.Value.GetType().GetProperty("message")?.GetValue(ok.Value));

            var updated = await db.Invoices.FirstAsync(x => x.Id == inv.Id);
            Assert.False(string.IsNullOrEmpty(updated.PdfFileName));
            var path = Path.Combine(env.WebRootPath ?? "wwwroot", "invoices", updated.PdfFileName);
            Assert.True(File.Exists(path));
            Assert.True(updated.PdfSize.HasValue);
            Assert.True(updated.PdfUploadedAt.HasValue);
        }

        [Fact]
        public async Task DownloadPdf_ReturnsPhysicalFile_Attachment()
        {
            using var db = CreateDbContext();
            var env = CreateEnvWithTempRoot();
            var fileName = "inv1.pdf";
            var folder = Path.Combine(env.WebRootPath, "invoices");
            Directory.CreateDirectory(folder);
            var path = Path.Combine(folder, fileName);
            await File.WriteAllTextAsync(path, "dummy");

            var inv = new Invoice
            {
                Code = "INV001",
                Status = InvoiceStatus.Paid,
                Total = 100,
                Subtotal = 100,
                CreatedAt = DateTime.UtcNow,
                PdfFileName = fileName,
                PdfOriginalName = "origin.pdf"
            };
            db.Invoices.Add(inv);
            await db.SaveChangesAsync();

            var email = new FakeEmailService();
            var controller = CreateController(db, email);

            var result = await controller.DownloadPdf(inv.Id, env, inline: false);

            var fileResult = Assert.IsType<PhysicalFileResult>(result);
            Assert.Equal("application/pdf", fileResult.ContentType);
            Assert.Equal("origin.pdf", fileResult.FileDownloadName);
        }

        [Fact]
        public async Task DeletePdf_ClearsPdfInfoAndDeletesFile()
        {
            using var db = CreateDbContext();
            var env = CreateEnvWithTempRoot();
            var fileName = "inv1.pdf";
            var folder = Path.Combine(env.WebRootPath, "invoices");
            Directory.CreateDirectory(folder);
            var path = Path.Combine(folder, fileName);
            await File.WriteAllTextAsync(path, "dummy");

            var inv = new Invoice
            {
                Code = "INV001",
                Status = InvoiceStatus.Paid,
                Total = 100,
                Subtotal = 100,
                CreatedAt = DateTime.UtcNow,
                PdfFileName = fileName,
                PdfOriginalName = "origin.pdf",
                PdfSize = 10,
                PdfUploadedAt = DateTime.UtcNow
            };
            db.Invoices.Add(inv);
            await db.SaveChangesAsync();

            var email = new FakeEmailService();
            var controller = CreateController(db, email);

            var result = await controller.DeletePdf(inv.Id, env);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Equal("Deleted", ok.Value.GetType().GetProperty("message")?.GetValue(ok.Value));

            var updated = await db.Invoices.FirstAsync(x => x.Id == inv.Id);
            Assert.Null(updated.PdfFileName);
            Assert.Null(updated.PdfOriginalName);
            Assert.Null(updated.PdfSize);
            Assert.Null(updated.PdfUploadedAt);
            Assert.False(File.Exists(path));
        }

        [Fact]
        public async Task SendInvoiceEmail_SendsEmail_WhenValid()
        {
            using var db = CreateDbContext();
            var inv = new Invoice
            {
                Code = "INV001",
                Status = InvoiceStatus.Paid,
                Total = 150,
                Subtotal = 150,
                CreatedAt = new DateTime(2025, 1, 1, 10, 0, 0, DateTimeKind.Utc),
                CustomerName = "Alice",
                Email = "alice@example.com",
                PdfFileName = "inv1.pdf"
            };
            db.Invoices.Add(inv);
            await db.SaveChangesAsync();

            var email = new FakeEmailService();
            var controller = CreateController(db, email);
            controller.ControllerContext.HttpContext.Request.Scheme = "https";
            controller.ControllerContext.HttpContext.Request.Host = new HostString("testhost");

            var result = await controller.SendInvoiceEmail(inv.Id);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Equal("Invoice email sent", ok.Value.GetType().GetProperty("message")?.GetValue(ok.Value));
            Assert.Equal("alice@example.com", email.LastTo);
            Assert.Contains("INV001", email.LastSubject);
            Assert.Contains("150", email.LastBody.Replace(".", "").Replace(",", ""));
            Assert.Contains("/api/invoices/" + inv.Id + "/pdf", email.LastBody);
        }
    }
}
