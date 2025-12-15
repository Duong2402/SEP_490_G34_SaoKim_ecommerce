using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using Moq;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Services;
using System;
using System.IO;
using System.Threading.Tasks;
using Xunit;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "TestApp";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public string EnvironmentName { get; set; } = "Development";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = Path.Combine(Path.GetTempPath(), "InvoicesTests_" + Guid.NewGuid());
    }

    public class InvoicesControllerTests
    {
        private static FakeWebHostEnvironment CreateEnvWithTempRoot()
        {
            var env = new FakeWebHostEnvironment();
            Directory.CreateDirectory(env.WebRootPath);
            return env;
        }

        private static InvoicesController CreateController(
            Mock<IInvoiceService> svcMock,
            IWebHostEnvironment env)
        {
            var controller = new InvoicesController(svcMock.Object, env);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };
            return controller;
        }

        [Fact]
        public async Task Get_ReturnsNotFound_WhenMissing()
        {
            var env = CreateEnvWithTempRoot();
            var svc = new Mock<IInvoiceService>(MockBehavior.Strict);

            svc.Setup(s => s.GetByIdAsync(999))
               .Returns(Task.FromResult<InvoiceDetailDto?>(null));

            var controller = CreateController(svc, env);

            var result = await controller.Get(999);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var msg = nf.Value?.GetType().GetProperty("message")?.GetValue(nf.Value)?.ToString();
            Assert.Equal("Không tìm thấy hóa đơn", msg);

            svc.Verify(s => s.GetByIdAsync(999), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task Get_ReturnsOk_WhenFound()
        {
            var env = CreateEnvWithTempRoot();
            var svc = new Mock<IInvoiceService>(MockBehavior.Strict);

            var dto = new InvoiceDetailDto();
            svc.Setup(s => s.GetByIdAsync(1))
               .Returns(Task.FromResult<InvoiceDetailDto?>(dto));

            var controller = CreateController(svc, env);

            var result = await controller.Get(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Same(dto, ok.Value);

            svc.Verify(s => s.GetByIdAsync(1), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task UpdateStatus_CallsService_AndReturnsOk()
        {
            var env = CreateEnvWithTempRoot();
            var svc = new Mock<IInvoiceService>(MockBehavior.Strict);

            svc.Setup(s => s.UpdateStatusAsync(1, "Paid"))
               .Returns(Task.CompletedTask);

            var controller = CreateController(svc, env);

            var result = await controller.UpdateStatus(1, new UpdateInvoiceStatusDto { Status = "Paid" });

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();
            Assert.Equal("Cập nhật trạng thái hóa đơn thành công", msg);

            svc.Verify(s => s.UpdateStatusAsync(1, "Paid"), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task Delete_CallsService_AndReturnsOk()
        {
            var env = CreateEnvWithTempRoot();
            var svc = new Mock<IInvoiceService>(MockBehavior.Strict);

            svc.Setup(s => s.DeleteAsync(10))
               .Returns(Task.CompletedTask);

            var controller = CreateController(svc, env);

            var result = await controller.Delete(10);

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();
            Assert.Equal("Xóa hóa đơn thành công", msg);

            svc.Verify(s => s.DeleteAsync(10), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task GeneratePdf_PassesCorrectFolder_AndReturnsOk()
        {
            var env = CreateEnvWithTempRoot();
            var svc = new Mock<IInvoiceService>(MockBehavior.Strict);

            var expectedFolder = Path.Combine(env.WebRootPath ?? "wwwroot", "invoices");

            svc.Setup(s => s.GeneratePdfAsync(5, expectedFolder))
   .Returns(Task.FromResult(Array.Empty<byte>()));

            var controller = CreateController(svc, env);

            var result = await controller.GeneratePdf(5);

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();
            Assert.Equal("Tạo PDF thành công", msg);

            svc.Verify(s => s.GeneratePdfAsync(5, expectedFolder), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task DownloadPdf_ReturnsNotFound_WhenServiceReturnsNullPath()
        {
            var env = CreateEnvWithTempRoot();
            var svc = new Mock<IInvoiceService>(MockBehavior.Strict);

            var folder = Path.Combine(env.WebRootPath ?? "wwwroot", "invoices");

            svc.Setup(s => s.GetPdfPathAsync(7, folder))
               .Returns(Task.FromResult<string?>(null));

            var controller = CreateController(svc, env);

            var result = await controller.DownloadPdf(7, inline: false);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var msg = nf.Value?.GetType().GetProperty("message")?.GetValue(nf.Value)?.ToString();
            Assert.Equal("Không tìm thấy PDF", msg);

            svc.Verify(s => s.GetPdfPathAsync(7, folder), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task DownloadPdf_ReturnsPhysicalFile_AsAttachment_WhenInlineFalse()
        {
            var env = CreateEnvWithTempRoot();
            var svc = new Mock<IInvoiceService>(MockBehavior.Strict);

            var folder = Path.Combine(env.WebRootPath ?? "wwwroot", "invoices");
            Directory.CreateDirectory(folder);

            var path = Path.Combine(folder, "inv1.pdf");
            await File.WriteAllTextAsync(path, "dummy");

            svc.Setup(s => s.GetPdfPathAsync(1, folder))
               .Returns(Task.FromResult<string?>(path));

            var controller = CreateController(svc, env);

            var result = await controller.DownloadPdf(1, inline: false);

            var file = Assert.IsType<PhysicalFileResult>(result);
            Assert.Equal("application/pdf", file.ContentType);
            Assert.Equal("inv1.pdf", file.FileDownloadName);

            svc.Verify(s => s.GetPdfPathAsync(1, folder), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task DownloadPdf_ReturnsPhysicalFile_Inline_WhenInlineTrue()
        {
            var env = CreateEnvWithTempRoot();
            var svc = new Mock<IInvoiceService>(MockBehavior.Strict);

            var folder = Path.Combine(env.WebRootPath ?? "wwwroot", "invoices");
            Directory.CreateDirectory(folder);

            var path = Path.Combine(folder, "inv2.pdf");
            await File.WriteAllTextAsync(path, "dummy");

            svc.Setup(s => s.GetPdfPathAsync(2, folder))
               .Returns(Task.FromResult<string?>(path));

            var controller = CreateController(svc, env);

            var result = await controller.DownloadPdf(2, inline: true);

            var file = Assert.IsType<PhysicalFileResult>(result);
            Assert.Equal("application/pdf", file.ContentType);
            Assert.True(string.IsNullOrEmpty(file.FileDownloadName)); // inline không set tên tải về

            svc.Verify(s => s.GetPdfPathAsync(2, folder), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task DeletePdf_CallsService_WithCorrectFolder_AndReturnsOk()
        {
            var env = CreateEnvWithTempRoot();
            var svc = new Mock<IInvoiceService>(MockBehavior.Strict);

            var folder = Path.Combine(env.WebRootPath ?? "wwwroot", "invoices");

            svc.Setup(s => s.DeletePdfAsync(3, folder))
               .Returns(Task.CompletedTask);

            var controller = CreateController(svc, env);

            var result = await controller.DeletePdf(3);

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();
            Assert.Equal("Đã xóa PDF", msg);

            svc.Verify(s => s.DeletePdfAsync(3, folder), Times.Once);
            svc.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task SendEmail_BuildsPdfUrl_AndCallsService()
        {
            var env = CreateEnvWithTempRoot();
            var svc = new Mock<IInvoiceService>(MockBehavior.Strict);

            svc.Setup(s => s.SendInvoiceEmailAsync(9, "https://testhost/api/invoices/9/pdf"))
               .Returns(Task.CompletedTask);

            var controller = CreateController(svc, env);
            controller.ControllerContext.HttpContext.Request.Scheme = "https";
            controller.ControllerContext.HttpContext.Request.Host = new HostString("testhost");

            var result = await controller.SendEmail(9);

            var ok = Assert.IsType<OkObjectResult>(result);
            var msg = ok.Value?.GetType().GetProperty("message")?.GetValue(ok.Value)?.ToString();
            Assert.Equal("Đã gửi email hóa đơn", msg);

            svc.Verify(s => s.SendInvoiceEmailAsync(9, "https://testhost/api/invoices/9/pdf"), Times.Once);
            svc.VerifyNoOtherCalls();
        }
    }
}
