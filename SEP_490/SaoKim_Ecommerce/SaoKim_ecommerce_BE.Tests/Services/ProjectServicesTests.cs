using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Services;
using Xunit;

namespace SaoKim_ecommerce_BE.Tests.Services
{
    public class ProjectServiceTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new SaoKimDBContext(options);
        }

        private ProjectService CreateService(SaoKimDBContext db)
        {
            return new ProjectService(db);
        }

        [Fact]
        public async Task CreateAsync_Throws_When_EndDate_Before_StartDate()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var dto = new CreateProjectDTO
            {
                Name = "Test project",
                StartDate = new DateTime(2025, 2, 1),
                EndDate = new DateTime(2025, 1, 1)
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(
                () => service.CreateAsync(dto, "tester"));

            Assert.Contains("EndDate must be greater", ex.Message);
        }

        [Fact]
        public async Task CreateAsync_Throws_When_Code_Duplicate()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var existing = new Project
            {
                Code = "PRJ-2025-001",
                Name = "Existing",
                Status = "Draft"
            };
            db.Projects.Add(existing);
            await db.SaveChangesAsync();

            var dto = new CreateProjectDTO
            {
                Code = "PRJ-2025-001",
                Name = "New Project"
            };

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.CreateAsync(dto, "tester"));

            Assert.Contains("Project code already exists", ex.Message);
        }

        [Fact]
        public async Task CreateAsync_Generates_Code_And_Default_Status_When_Not_Provided()
        {
            using var db = CreateDbContext();
            var service = CreateService(db);

            var dto = new CreateProjectDTO
            {
                Name = "New Project",
                CustomerName = "  Customer A  ",
                CustomerContact = "  0123  ",
                Status = null,
                Budget = 1_000_000
            };

            var result = await service.CreateAsync(dto, "tester");

            Assert.NotNull(result);
            Assert.False(string.IsNullOrWhiteSpace(result.Code));
            Assert.StartsWith("PRJ-", result.Code);

            Assert.Equal("New Project", result.Name);
            Assert.Equal("Customer A", result.CustomerName);
            Assert.Equal("0123", result.CustomerContact);

            Assert.Equal("Draft", result.Status);

            var projectInDb = await db.Projects.FirstAsync();
            Assert.Equal(result.Code, projectInDb.Code);
            Assert.Equal("Draft", projectInDb.Status);
            Assert.Equal("tester", projectInDb.CreatedBy);
        }
    }
}
