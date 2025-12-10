using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services;
using Xunit;
using TaskStatusEnum = SaoKim_ecommerce_BE.Entities.TaskStatus;

namespace SaoKim_ecommerce_BE.Tests.Services
{
    public class ProjectProductServiceTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new SaoKimDBContext(options);
        }

        [Fact]
        public async Task GetProductsAsync_Throws_WhenProjectNotFound()
        {
            using var db = CreateDbContext();
            var service = new ProjectProductService(db);
            await Assert.ThrowsAsync<KeyNotFoundException>(() => service.GetProductsAsync(1));
        }

        [Fact]
        public async Task GetProductsAsync_ReturnsEmptyList_WhenNoItems()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Test" });
            await db.SaveChangesAsync();
            var service = new ProjectProductService(db);

            var res = await service.GetProductsAsync(1);

            Assert.Equal(1, res.ProjectId);
            Assert.Empty(res.Items);
            Assert.Equal(0m, res.Subtotal);
        }

        [Fact]
        public async Task GetProductsAsync_ReturnsItemsAndSubtotal()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Test" });
            db.ProjectProducts.Add(new ProjectProduct { Id = 1, ProjectId = 1, ProductId = 10, ProductName = "A", Uom = "pcs", Quantity = 2, UnitPrice = 100, Total = 200 });
            db.ProjectProducts.Add(new ProjectProduct { Id = 2, ProjectId = 1, ProductId = 11, ProductName = "B", Uom = "pcs", Quantity = 1, UnitPrice = 300, Total = 300 });
            await db.SaveChangesAsync();
            var service = new ProjectProductService(db);

            var res = await service.GetProductsAsync(1);

            Assert.Equal(2, res.Items.Count());
            Assert.Equal(500m, res.Subtotal);
        }

        [Fact]
        public async Task AddProductAsync_Throws_WhenProjectNotFound()
        {
            using var db = CreateDbContext();
            var service = new ProjectProductService(db);
            var dto = new ProjectProductCreateDTO { ProductId = 1, Quantity = 1, UnitPrice = 10m };

            await Assert.ThrowsAsync<KeyNotFoundException>(() => service.AddProductAsync(1, dto));
        }

        [Fact]
        public async Task AddProductAsync_Throws_WhenProductNotFound()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Test" });
            await db.SaveChangesAsync();
            var service = new ProjectProductService(db);
            var dto = new ProjectProductCreateDTO { ProductId = 999, Quantity = 1, UnitPrice = 10m };

            await Assert.ThrowsAsync<KeyNotFoundException>(() => service.AddProductAsync(1, dto));
        }

        [Fact]
        public async Task AddProductAsync_Throws_WhenDuplicate()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Test" });
            db.Products.Add(new Product { ProductID = 10, ProductName = "A" });
            db.ProjectProducts.Add(new ProjectProduct { ProjectId = 1, ProductId = 10, ProductName = "A", Quantity = 1, UnitPrice = 10m, Total = 10m });
            await db.SaveChangesAsync();
            var service = new ProjectProductService(db);
            var dto = new ProjectProductCreateDTO { ProductId = 10, Quantity = 2, UnitPrice = 20m };

            await Assert.ThrowsAsync<InvalidOperationException>(() => service.AddProductAsync(1, dto));
        }

        [Fact]
        public async Task AddProductAsync_UsesDetailPrice_WhenUnitPriceNull()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Test" });
            var product = new Product { ProductID = 10, ProductName = "A" };
            product.ProductDetails.Add(new ProductDetail { Id = 1, ProductID = 10, Price = 50m, Unit = "box" });
            db.Products.Add(product);
            await db.SaveChangesAsync();
            var service = new ProjectProductService(db);
            var dto = new ProjectProductCreateDTO { ProductId = 10, Quantity = 3, UnitPrice = null };

            var res = await service.AddProductAsync(1, dto);

            Assert.Equal(50m, res.UnitPrice);
            Assert.Equal(150m, res.Total);
            Assert.Equal("box", res.Uom);
        }

        [Fact]
        public async Task UpdateProductAsync_ReturnsNull_WhenNotFound()
        {
            using var db = CreateDbContext();
            var service = new ProjectProductService(db);
            var dto = new ProjectProductUpdateDTO { Quantity = 2, UnitPrice = 10m, Note = "x" };

            var res = await service.UpdateProductAsync(1, 1, dto);

            Assert.Null(res);
        }

        [Fact]
        public async Task UpdateProductAsync_UpdatesEntity()
        {
            using var db = CreateDbContext();
            var entity = new ProjectProduct { Id = 1, ProjectId = 1, ProductId = 10, ProductName = "A", Uom = "pcs", Quantity = 1, UnitPrice = 10m, Total = 10m, Note = null };
            db.ProjectProducts.Add(entity);
            await db.SaveChangesAsync();
            var service = new ProjectProductService(db);
            var dto = new ProjectProductUpdateDTO { Quantity = 5, UnitPrice = 20m, Note = "Updated" };

            var res = await service.UpdateProductAsync(1, 1, dto);

            Assert.NotNull(res);
            Assert.Equal(5, res.Quantity);
            Assert.Equal(20m, res.UnitPrice);
            Assert.Equal(100m, res.Total);
            Assert.Equal("Updated", res.Note);
        }

        [Fact]
        public async Task RemoveProductAsync_ReturnsFalse_WhenNotFound()
        {
            using var db = CreateDbContext();
            var service = new ProjectProductService(db);

            var ok = await service.RemoveProductAsync(1, 1);

            Assert.False(ok);
        }

        [Fact]
        public async Task RemoveProductAsync_RemovesEntity_WhenFound()
        {
            using var db = CreateDbContext();
            db.ProjectProducts.Add(new ProjectProduct { Id = 1, ProjectId = 1, ProductId = 10, ProductName = "A", Quantity = 1, UnitPrice = 10m, Total = 10m });
            await db.SaveChangesAsync();
            var service = new ProjectProductService(db);

            var ok = await service.RemoveProductAsync(1, 1);

            Assert.True(ok);
            Assert.Empty(db.ProjectProducts);
        }
    }

    public class ProjectExpenseServiceTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new SaoKimDBContext(options);
        }

        [Fact]
        public async Task QueryAsync_Throws_WhenProjectNotFound()
        {
            using var db = CreateDbContext();
            var service = new ProjectExpenseService(db);
            var q = new ProjectExpenseQuery();

            await Assert.ThrowsAsync<KeyNotFoundException>(() => service.QueryAsync(1, q));
        }

        [Fact]
        public async Task QueryAsync_FiltersByDateRange()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Test" });
            db.ProjectExpenses.Add(new ProjectExpense { Id = 1, ProjectId = 1, Date = new DateTime(2024, 1, 1), Amount = 100 });
            db.ProjectExpenses.Add(new ProjectExpense { Id = 2, ProjectId = 1, Date = new DateTime(2024, 2, 1), Amount = 200 });
            await db.SaveChangesAsync();
            var service = new ProjectExpenseService(db);
            var q = new ProjectExpenseQuery { From = new DateTime(2024, 1, 15) };

            var res = await service.QueryAsync(1, q);

            Assert.Single(res.Page.Items);
            Assert.Equal(200m, res.TotalAmount);
        }

        [Fact]
        public async Task QueryAsync_FiltersByKeyword()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Test" });
            db.ProjectExpenses.Add(new ProjectExpense { Id = 1, ProjectId = 1, Vendor = "ABC", Category = "Cat", Description = "Something", Amount = 50, Date = DateTime.UtcNow, CreatedAt = DateTime.UtcNow });
            db.ProjectExpenses.Add(new ProjectExpense { Id = 2, ProjectId = 1, Vendor = "XYZ", Category = "Other", Description = "Else", Amount = 100, Date = DateTime.UtcNow, CreatedAt = DateTime.UtcNow });
            await db.SaveChangesAsync();
            var service = new ProjectExpenseService(db);
            var q = new ProjectExpenseQuery { Keyword = "abc" };

            var res = await service.QueryAsync(1, q);

            var item = Assert.Single(res.Page.Items);
            Assert.Equal("ABC", item.Vendor);
        }

        [Fact]
        public async Task QueryAsync_SortsByAmountDescending()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Test" });
            db.ProjectExpenses.Add(new ProjectExpense { Id = 1, ProjectId = 1, Date = DateTime.UtcNow, Amount = 50, CreatedAt = DateTime.UtcNow });
            db.ProjectExpenses.Add(new ProjectExpense { Id = 2, ProjectId = 1, Date = DateTime.UtcNow, Amount = 200, CreatedAt = DateTime.UtcNow });
            await db.SaveChangesAsync();
            var service = new ProjectExpenseService(db);
            var q = new ProjectExpenseQuery { Sort = "-Amount" };

            var res = await service.QueryAsync(1, q);

            Assert.Equal(2, res.Page.Items.Count());
            Assert.Equal(200m, res.Page.Items.First().Amount);
        }

        [Fact]
        public async Task GetAsync_ReturnsNull_WhenNotFound()
        {
            using var db = CreateDbContext();
            var service = new ProjectExpenseService(db);

            var res = await service.GetAsync(1, 1);

            Assert.Null(res);
        }

        [Fact]
        public async Task GetAsync_ReturnsItem_WhenFound()
        {
            using var db = CreateDbContext();
            db.ProjectExpenses.Add(new ProjectExpense { Id = 1, ProjectId = 1, Date = DateTime.UtcNow, Amount = 100 });
            await db.SaveChangesAsync();
            var service = new ProjectExpenseService(db);

            var res = await service.GetAsync(1, 1);

            Assert.NotNull(res);
            Assert.Equal(100m, res.Amount);
        }

        [Fact]
        public async Task CreateAsync_Throws_WhenProjectNotFound()
        {
            using var db = CreateDbContext();
            var service = new ProjectExpenseService(db);
            var dto = new ProjectExpenseCreateDTO { Date = DateTime.UtcNow, Amount = 10m };

            await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreateAsync(1, dto, "user"));
        }

        [Fact]
        public async Task CreateAsync_Throws_WhenAmountNegative()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Test" });
            await db.SaveChangesAsync();
            var service = new ProjectExpenseService(db);
            var dto = new ProjectExpenseCreateDTO { Date = DateTime.UtcNow, Amount = -1m };

            await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(1, dto, "user"));
        }

        [Fact]
        public async Task CreateAsync_CreatesExpense()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Test" });
            await db.SaveChangesAsync();
            var service = new ProjectExpenseService(db);
            var dto = new ProjectExpenseCreateDTO { Date = DateTime.UtcNow, Amount = 100m, Category = "C", Vendor = "V" };

            var res = await service.CreateAsync(1, dto, "user");

            Assert.Equal(100m, res.Amount);
            Assert.Equal(1, db.ProjectExpenses.Count());
        }

        [Fact]
        public async Task UpdateAsync_ReturnsNull_WhenNotFound()
        {
            using var db = CreateDbContext();
            var service = new ProjectExpenseService(db);
            var dto = new ProjectExpenseUpdateDTO { Date = DateTime.UtcNow, Amount = 10m };

            var res = await service.UpdateAsync(1, 1, dto, "user");

            Assert.Null(res);
        }

        [Fact]
        public async Task UpdateAsync_Throws_WhenAmountNegative()
        {
            using var db = CreateDbContext();
            db.ProjectExpenses.Add(new ProjectExpense { Id = 1, ProjectId = 1, Date = DateTime.UtcNow, Amount = 10m });
            await db.SaveChangesAsync();
            var service = new ProjectExpenseService(db);
            var dto = new ProjectExpenseUpdateDTO { Date = DateTime.UtcNow, Amount = -5m };

            await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateAsync(1, 1, dto, "user"));
        }

        [Fact]
        public async Task UpdateAsync_UpdatesFields()
        {
            using var db = CreateDbContext();
            db.ProjectExpenses.Add(new ProjectExpense { Id = 1, ProjectId = 1, Date = DateTime.UtcNow, Amount = 10m, Vendor = "V1" });
            await db.SaveChangesAsync();
            var service = new ProjectExpenseService(db);
            var dto = new ProjectExpenseUpdateDTO { Date = DateTime.UtcNow.Date, Amount = 20m, Vendor = "V2" };

            var res = await service.UpdateAsync(1, 1, dto, "user");

            Assert.NotNull(res);
            Assert.Equal(20m, res.Amount);
            Assert.Equal("V2", res.Vendor);
        }

        [Fact]
        public async Task DeleteAsync_ReturnsFalse_WhenNotFound()
        {
            using var db = CreateDbContext();
            var service = new ProjectExpenseService(db);

            var ok = await service.DeleteAsync(1, 1);

            Assert.False(ok);
        }

        [Fact]
        public async Task DeleteAsync_RemovesEntity_WhenFound()
        {
            using var db = CreateDbContext();
            db.ProjectExpenses.Add(new ProjectExpense { Id = 1, ProjectId = 1, Date = DateTime.UtcNow, Amount = 10m });
            await db.SaveChangesAsync();
            var service = new ProjectExpenseService(db);

            var ok = await service.DeleteAsync(1, 1);

            Assert.True(ok);
            Assert.Empty(db.ProjectExpenses);
        }
    }

    public class ProjectProductsControllerTests
    {
        private class FakeProjectProductService : IProjectProductService
        {
            public Func<int, Task<ProjectProductListDTO>> GetProductsAsyncImpl { get; set; }
            public Func<int, ProjectProductCreateDTO, Task<ProjectProductItemDTO>> AddProductAsyncImpl { get; set; }
            public Func<int, int, ProjectProductUpdateDTO, Task<ProjectProductItemDTO>> UpdateProductAsyncImpl { get; set; }
            public Func<int, int, Task<bool>> RemoveProductAsyncImpl { get; set; }

            public Task<ProjectProductListDTO> GetProductsAsync(int projectId) => GetProductsAsyncImpl(projectId);
            public Task<ProjectProductItemDTO> AddProductAsync(int projectId, ProjectProductCreateDTO dto) => AddProductAsyncImpl(projectId, dto);
            public Task<ProjectProductItemDTO> UpdateProductAsync(int projectId, int projectProductId, ProjectProductUpdateDTO dto) => UpdateProductAsyncImpl(projectId, projectProductId, dto);
            public Task<bool> RemoveProductAsync(int projectId, int projectProductId) => RemoveProductAsyncImpl(projectId, projectProductId);
        }

        [Fact]
        public async Task GetList_ReturnsOk_WhenServiceSuccess()
        {
            var fake = new FakeProjectProductService
            {
                GetProductsAsyncImpl = id => Task.FromResult(new ProjectProductListDTO { ProjectId = id, Items = new List<ProjectProductItemDTO>() })
            };
            var controller = new ProjectProductsController(fake);

            var result = await controller.GetList(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<ProjectProductListDTO>>(ok.Value);
            Assert.True(res.Success);
            Assert.Equal(1, res.Data.ProjectId);
        }

        [Fact]
        public async Task GetList_ReturnsNotFound_WhenServiceThrowsKeyNotFound()
        {
            var fake = new FakeProjectProductService
            {
                GetProductsAsyncImpl = id => throw new KeyNotFoundException("Project not found")
            };
            var controller = new ProjectProductsController(fake);

            var result = await controller.GetList(1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
            Assert.Equal("Project not found", res.Message);
        }

        [Fact]
        public async Task Add_ReturnsValidationProblem_WhenModelInvalid()
        {
            var fake = new FakeProjectProductService();
            var controller = new ProjectProductsController(fake);
            controller.ModelState.AddModelError("ProductId", "Required");
            var dto = new ProjectProductCreateDTO();

            var result = await controller.Add(1, dto);

            Assert.IsType<ObjectResult>(result);
        }

        [Fact]
        public async Task Add_ReturnsOk_WhenSuccess()
        {
            var fake = new FakeProjectProductService
            {
                AddProductAsyncImpl = (id, dto) => Task.FromResult(new ProjectProductItemDTO { Id = 1, ProductId = dto.ProductId })
            };
            var controller = new ProjectProductsController(fake);
            var dto = new ProjectProductCreateDTO { ProductId = 10, Quantity = 1, UnitPrice = 10m };

            var result = await controller.Add(1, dto);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<ProjectProductItemDTO>>(ok.Value);
            Assert.True(res.Success);
            Assert.Equal(10, res.Data.ProductId);
            Assert.Equal("Added", res.Message);
        }

        [Fact]
        public async Task Add_ReturnsNotFound_WhenServiceThrowsKeyNotFound()
        {
            var fake = new FakeProjectProductService
            {
                AddProductAsyncImpl = (id, dto) => throw new KeyNotFoundException("Project not found")
            };
            var controller = new ProjectProductsController(fake);
            var dto = new ProjectProductCreateDTO { ProductId = 10, Quantity = 1, UnitPrice = 10m };

            var result = await controller.Add(1, dto);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
            Assert.Equal("Project not found", res.Message);
        }

        [Fact]
        public async Task Add_ReturnsConflict_WhenServiceThrowsInvalidOperation()
        {
            var fake = new FakeProjectProductService
            {
                AddProductAsyncImpl = (id, dto) => throw new InvalidOperationException("Duplicate")
            };
            var controller = new ProjectProductsController(fake);
            var dto = new ProjectProductCreateDTO { ProductId = 10, Quantity = 1, UnitPrice = 10m };

            var result = await controller.Add(1, dto);

            var cf = Assert.IsType<ConflictObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(cf.Value);
            Assert.False(res.Success);
            Assert.Equal("Duplicate", res.Message);
        }

        [Fact]
        public async Task Update_ReturnsValidationProblem_WhenModelInvalid()
        {
            var fake = new FakeProjectProductService();
            var controller = new ProjectProductsController(fake);
            controller.ModelState.AddModelError("Quantity", "Required");
            var dto = new ProjectProductUpdateDTO();

            var result = await controller.Update(1, 1, dto);

            Assert.IsType<ObjectResult>(result);
        }

        [Fact]
        public async Task Update_ReturnsNotFound_WhenServiceReturnsNull()
        {
            var fake = new FakeProjectProductService
            {
                UpdateProductAsyncImpl = (p, id, dto) => Task.FromResult<ProjectProductItemDTO>(null)
            };
            var controller = new ProjectProductsController(fake);
            var dto = new ProjectProductUpdateDTO { Quantity = 1, UnitPrice = 10m };

            var result = await controller.Update(1, 1, dto);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
            Assert.Equal("Item not found", res.Message);
        }

        [Fact]
        public async Task Update_ReturnsOk_WhenSuccess()
        {
            var fake = new FakeProjectProductService
            {
                UpdateProductAsyncImpl = (p, id, dto) => Task.FromResult(new ProjectProductItemDTO { Id = id, Quantity = dto.Quantity })
            };
            var controller = new ProjectProductsController(fake);
            var dto = new ProjectProductUpdateDTO { Quantity = 3, UnitPrice = 20m };

            var result = await controller.Update(1, 1, dto);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<ProjectProductItemDTO>>(ok.Value);
            Assert.True(res.Success);
            Assert.Equal(3, res.Data.Quantity);
            Assert.Equal("Updated", res.Message);
        }

        [Fact]
        public async Task Delete_ReturnsNotFound_WhenServiceReturnsFalse()
        {
            var fake = new FakeProjectProductService
            {
                RemoveProductAsyncImpl = (p, id) => Task.FromResult(false)
            };
            var controller = new ProjectProductsController(fake);

            var result = await controller.Delete(1, 1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
        }

        [Fact]
        public async Task Delete_ReturnsOk_WhenSuccess()
        {
            var fake = new FakeProjectProductService
            {
                RemoveProductAsyncImpl = (p, id) => Task.FromResult(true)
            };
            var controller = new ProjectProductsController(fake);

            var result = await controller.Delete(1, 1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(ok.Value);
            Assert.True(res.Success);
            Assert.Equal("Deleted", res.Data);
        }
    }

    public class ProjectExpensesControllerTests
    {
        private class FakeProjectExpenseService : IProjectExpenseService
        {
            public Func<int, ProjectExpenseQuery, Task<ProjectExpenseListResult>> QueryAsyncImpl { get; set; }
            public Func<int, int, Task<ProjectExpenseListItemDTO>> GetAsyncImpl { get; set; }
            public Func<int, ProjectExpenseCreateDTO, string, Task<ProjectExpenseListItemDTO>> CreateAsyncImpl { get; set; }
            public Func<int, int, ProjectExpenseUpdateDTO, string, Task<ProjectExpenseListItemDTO>> UpdateAsyncImpl { get; set; }
            public Func<int, int, Task<bool>> DeleteAsyncImpl { get; set; }

            public Task<ProjectExpenseListResult> QueryAsync(int projectId, ProjectExpenseQuery q) => QueryAsyncImpl(projectId, q);
            public Task<ProjectExpenseListItemDTO> GetAsync(int projectId, int id) => GetAsyncImpl(projectId, id);
            public Task<ProjectExpenseListItemDTO> CreateAsync(int projectId, ProjectExpenseCreateDTO dto, string who) => CreateAsyncImpl(projectId, dto, who);
            public Task<ProjectExpenseListItemDTO> UpdateAsync(int projectId, int id, ProjectExpenseUpdateDTO dto, string who) => UpdateAsyncImpl(projectId, id, dto, who);
            public Task<bool> DeleteAsync(int projectId, int id) => DeleteAsyncImpl(projectId, id);
        }

        [Fact]
        public async Task Query_ReturnsOk_WhenSuccess()
        {
            var fake = new FakeProjectExpenseService
            {
                QueryAsyncImpl = (id, q) => Task.FromResult(new ProjectExpenseListResult { TotalAmount = 0m, Page = new PagedResult<ProjectExpenseListItemDTO>() })
            };
            var controller = new ProjectExpensesController(fake);

            var result = await controller.Query(1, new ProjectExpenseQuery());

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<ProjectExpenseListResult>>(ok.Value);
            Assert.True(res.Success);
        }

        [Fact]
        public async Task Query_ReturnsNotFound_WhenServiceThrowsKeyNotFound()
        {
            var fake = new FakeProjectExpenseService
            {
                QueryAsyncImpl = (id, q) => throw new KeyNotFoundException()
            };
            var controller = new ProjectExpensesController(fake);

            var result = await controller.Query(1, new ProjectExpenseQuery());

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
            Assert.Equal("Project not found", res.Message);
        }

        [Fact]
        public async Task Get_ReturnsNotFound_WhenNull()
        {
            var fake = new FakeProjectExpenseService
            {
                GetAsyncImpl = (p, id) => Task.FromResult<ProjectExpenseListItemDTO>(null)
            };
            var controller = new ProjectExpensesController(fake);

            var result = await controller.Get(1, 1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
            Assert.Equal("Expense not found", res.Message);
        }

        [Fact]
        public async Task Get_ReturnsOk_WhenFound()
        {
            var fake = new FakeProjectExpenseService
            {
                GetAsyncImpl = (p, id) => Task.FromResult(new ProjectExpenseListItemDTO { Id = id })
            };
            var controller = new ProjectExpensesController(fake);

            var result = await controller.Get(1, 1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<ProjectExpenseListItemDTO>>(ok.Value);
            Assert.True(res.Success);
            Assert.Equal(1, res.Data.Id);
        }

        [Fact]
        public async Task Create_ReturnsValidationProblem_WhenModelInvalid()
        {
            var fake = new FakeProjectExpenseService();
            var controller = new ProjectExpensesController(fake);
            controller.ModelState.AddModelError("Date", "Required");

            var result = await controller.Create(1, new ProjectExpenseCreateDTO());

            Assert.IsType<ObjectResult>(result);
        }

        [Fact]
        public async Task Create_ReturnsCreated_WhenSuccess()
        {
            var fake = new FakeProjectExpenseService
            {
                CreateAsyncImpl = (p, dto, who) => Task.FromResult(new ProjectExpenseListItemDTO { Id = 10 })
            };
            var controller = new ProjectExpensesController(fake);

            var result = await controller.Create(1, new ProjectExpenseCreateDTO { Date = DateTime.UtcNow, Amount = 10m });

            var created = Assert.IsType<CreatedAtActionResult>(result);
            var res = Assert.IsType<ApiResponse<ProjectExpenseListItemDTO>>(created.Value);
            Assert.True(res.Success);
            Assert.Equal(10, res.Data.Id);
        }

        [Fact]
        public async Task Create_ReturnsBadRequest_WhenArgumentException()
        {
            var fake = new FakeProjectExpenseService
            {
                CreateAsyncImpl = (p, dto, who) => throw new ArgumentException("Amount invalid")
            };
            var controller = new ProjectExpensesController(fake);

            var result = await controller.Create(1, new ProjectExpenseCreateDTO { Date = DateTime.UtcNow, Amount = -1m });

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(br.Value);
            Assert.False(res.Success);
            Assert.Equal("Amount invalid", res.Message);
        }

        [Fact]
        public async Task Create_ReturnsNotFound_WhenKeyNotFound()
        {
            var fake = new FakeProjectExpenseService
            {
                CreateAsyncImpl = (p, dto, who) => throw new KeyNotFoundException()
            };
            var controller = new ProjectExpensesController(fake);

            var result = await controller.Create(1, new ProjectExpenseCreateDTO { Date = DateTime.UtcNow, Amount = 10m });

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
            Assert.Equal("Project not found", res.Message);
        }

        [Fact]
        public async Task Update_ReturnsValidationProblem_WhenModelInvalid()
        {
            var fake = new FakeProjectExpenseService();
            var controller = new ProjectExpensesController(fake);
            controller.ModelState.AddModelError("Amount", "Required");

            var result = await controller.Update(1, 1, new ProjectExpenseUpdateDTO());

            Assert.IsType<ObjectResult>(result);
        }

        [Fact]
        public async Task Update_ReturnsNotFound_WhenServiceReturnsNull()
        {
            var fake = new FakeProjectExpenseService
            {
                UpdateAsyncImpl = (p, id, dto, who) => Task.FromResult<ProjectExpenseListItemDTO>(null)
            };
            var controller = new ProjectExpensesController(fake);

            var result = await controller.Update(1, 1, new ProjectExpenseUpdateDTO { Date = DateTime.UtcNow, Amount = 10m });

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
            Assert.Equal("Expense not found", res.Message);
        }

        [Fact]
        public async Task Update_ReturnsOk_WhenSuccess()
        {
            var fake = new FakeProjectExpenseService
            {
                UpdateAsyncImpl = (p, id, dto, who) => Task.FromResult(new ProjectExpenseListItemDTO { Id = id })
            };
            var controller = new ProjectExpensesController(fake);

            var result = await controller.Update(1, 1, new ProjectExpenseUpdateDTO { Date = DateTime.UtcNow, Amount = 20m });

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<ProjectExpenseListItemDTO>>(ok.Value);
            Assert.True(res.Success);
            Assert.Equal("Updated", res.Message);
        }

        [Fact]
        public async Task Update_ReturnsBadRequest_WhenArgumentException()
        {
            var fake = new FakeProjectExpenseService
            {
                UpdateAsyncImpl = (p, id, dto, who) => throw new ArgumentException("Amount invalid")
            };
            var controller = new ProjectExpensesController(fake);

            var result = await controller.Update(1, 1, new ProjectExpenseUpdateDTO { Date = DateTime.UtcNow, Amount = -5m });

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(br.Value);
            Assert.False(res.Success);
            Assert.Equal("Amount invalid", res.Message);
        }

        [Fact]
        public async Task Delete_ReturnsNotFound_WhenServiceReturnsFalse()
        {
            var fake = new FakeProjectExpenseService
            {
                DeleteAsyncImpl = (p, id) => Task.FromResult(false)
            };
            var controller = new ProjectExpensesController(fake);

            var result = await controller.Delete(1, 1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
            Assert.Equal("Expense not found", res.Message);
        }

        [Fact]
        public async Task Delete_ReturnsOk_WhenSuccess()
        {
            var fake = new FakeProjectExpenseService
            {
                DeleteAsyncImpl = (p, id) => Task.FromResult(true)
            };
            var controller = new ProjectExpensesController(fake);

            var result = await controller.Delete(1, 1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(ok.Value);
            Assert.True(res.Success);
            Assert.Equal("Deleted", res.Data);
        }
    }

    public class ProjectServiceTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new SaoKimDBContext(options);
        }

        [Fact]
        public async Task CreateAsync_Throws_WhenEndDateBeforeStartDate()
        {
            using var db = CreateDbContext();
            var service = new ProjectService(db);
            var dto = new CreateProjectDTO
            {
                Name = "P1",
                StartDate = new DateTime(2024, 2, 1),
                EndDate = new DateTime(2024, 1, 1)
            };

            await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(dto, "user"));
        }

        [Fact]
        public async Task CreateAsync_Throws_WhenCodeExists()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Code = "PRJ-001", Name = "Old" });
            await db.SaveChangesAsync();
            var service = new ProjectService(db);
            var dto = new CreateProjectDTO { Code = "PRJ-001", Name = "New" };

            await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync(dto, "user"));
        }

        [Fact]
        public async Task CreateAsync_GeneratesCode_WhenEmpty()
        {
            using var db = CreateDbContext();
            var service = new ProjectService(db);
            var dto = new CreateProjectDTO { Name = "New Project" };

            var res = await service.CreateAsync(dto, "user");

            Assert.False(string.IsNullOrWhiteSpace(res.Code));
        }

        [Fact]
        public async Task UpdateAsync_ReturnsNull_WhenNotFound()
        {
            using var db = CreateDbContext();
            var service = new ProjectService(db);
            var dto = new UpdateProjectDTO { Name = "New Name" };

            var res = await service.UpdateAsync(1, dto, "user");

            Assert.Null(res);
        }

        [Fact]
        public async Task UpdateAsync_Throws_WhenEndDateBeforeStartDate()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Old" });
            await db.SaveChangesAsync();
            var service = new ProjectService(db);
            var dto = new UpdateProjectDTO
            {
                Name = "New",
                StartDate = new DateTime(2024, 2, 1),
                EndDate = new DateTime(2024, 1, 1)
            };

            await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateAsync(1, dto, "user"));
        }

        [Fact]
        public async Task DeleteAsync_ReturnsFalse_WhenNotFound()
        {
            using var db = CreateDbContext();
            var service = new ProjectService(db);

            var ok = await service.DeleteAsync(1);

            Assert.False(ok);
        }

        [Fact]
        public async Task DeleteAsync_RemovesProject_WhenExists()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Old" });
            await db.SaveChangesAsync();
            var service = new ProjectService(db);

            var ok = await service.DeleteAsync(1);

            Assert.True(ok);
            Assert.Empty(db.Projects);
        }

        [Fact]
        public async Task QueryAsync_FiltersByKeyword()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P-001", Name = "Alpha", CustomerName = "CustA", CreatedAt = DateTime.UtcNow });
            db.Projects.Add(new Project { Id = 2, Code = "P-002", Name = "Beta", CustomerName = "Other", CreatedAt = DateTime.UtcNow });
            await db.SaveChangesAsync();
            var service = new ProjectService(db);
            var q = new ProjectQuery { Keyword = "alpha" };

            var res = await service.QueryAsync(q);

            var item = Assert.Single(res.Items);
            Assert.Equal("Alpha", item.Name);
        }

        [Fact]
        public async Task QueryAsync_FiltersByProjectManager()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P-001", Name = "A", ProjectManagerId = 10, CreatedAt = DateTime.UtcNow });
            db.Projects.Add(new Project { Id = 2, Code = "P-002", Name = "B", ProjectManagerId = 11, CreatedAt = DateTime.UtcNow });
            await db.SaveChangesAsync();
            var service = new ProjectService(db);
            var q = new ProjectQuery { ProjectManagerId = 10 };

            var res = await service.QueryAsync(q);

            var item = Assert.Single(res.Items);
            Assert.Equal(10, item.ProjectManagerId);
        }

        [Fact]
        public async Task GetByIdAsync_ReturnsNull_WhenNotFound()
        {
            using var db = CreateDbContext();
            var service = new ProjectService(db);

            var res = await service.GetByIdAsync(1);

            Assert.Null(res);
        }

        [Fact]
        public async Task GetByIdAsync_ReturnsProject_WhenFound()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Prj" });
            await db.SaveChangesAsync();
            var service = new ProjectService(db);

            var res = await service.GetByIdAsync(1);

            Assert.NotNull(res);
            Assert.Equal("P1", res.Code);
        }
    }

    public class ProjectReportsControllerTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new SaoKimDBContext(options);
        }

        [Fact]
        public async Task GetReportJson_ReturnsNotFound_WhenProjectMissing()
        {
            using var db = CreateDbContext();
            var controller = new ProjectReportsController(db);

            var result = await controller.GetReportJson(1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
            Assert.Equal("Project not found", res.Message);
        }

        [Fact]
        public async Task GetReportJson_ReturnsOk_WhenProjectExists()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "PRJ-001", Name = "Test", Budget = 1000m });
            await db.SaveChangesAsync();
            var controller = new ProjectReportsController(db);

            var result = await controller.GetReportJson(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<ProjectReportDTOs>>(ok.Value);
            Assert.True(res.Success);
            Assert.Equal(1, res.Data.ProjectId);
        }

        [Fact]
        public async Task GetReportPdf_ReturnsNotFound_WhenProjectMissing()
        {
            using var db = CreateDbContext();
            var controller = new ProjectReportsController(db);

            var result = await controller.GetReportPdf(1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
        }

        [Fact]
        public async Task GetReportPdf_ReturnsFile_WhenProjectExists()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "PRJ-001", Name = "Test", Budget = 1000m });
            await db.SaveChangesAsync();
            var controller = new ProjectReportsController(db);

            var result = await controller.GetReportPdf(1);

            var file = Assert.IsType<FileContentResult>(result);
            Assert.Equal("application/pdf", file.ContentType);
            Assert.NotEmpty(file.FileContents);
        }

        [Fact]
        public async Task Report_ComputesTaskProgress()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "PRJ-001", Name = "Test" });
            var t1 = new TaskItem { Id = 1, ProjectId = 1, Name = "T1" };
            t1.Days.Add(new TaskDay { Date = DateTime.UtcNow, Status = TaskStatusEnum.Done });
            var t2 = new TaskItem { Id = 2, ProjectId = 1, Name = "T2" };
            t2.Days.Add(new TaskDay { Date = DateTime.UtcNow, Status = TaskStatusEnum.Delayed });
            db.TaskItems.AddRange(t1, t2);
            await db.SaveChangesAsync();
            var controller = new ProjectReportsController(db);

            var result = await controller.GetReportJson(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<ProjectReportDTOs>>(ok.Value);
            Assert.Equal(2, res.Data.TaskCount);
            Assert.Equal(1, res.Data.TaskCompleted);
            Assert.Equal(1, res.Data.TaskDelayed);
        }

        [Fact]
        public async Task Report_ComputesFinancials()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "PRJ-001", Name = "Test", Budget = 1000m });

            db.ProjectProducts.Add(new ProjectProduct
            {
                ProjectId = 1,
                ProductId = 1,
                ProductName = "Any",
                Uom = "pcs",
                Quantity = 1,
                UnitPrice = 800m,
                Total = 800m
            });

            db.ProjectExpenses.Add(new ProjectExpense
            {
                ProjectId = 1,
                Amount = 100m,
                Date = DateTime.UtcNow,      
                CreatedAt = DateTime.UtcNow
            });

            await db.SaveChangesAsync();
            var controller = new ProjectReportsController(db);

            var result = await controller.GetReportJson(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<ProjectReportDTOs>>(ok.Value);
            Assert.Equal(800m, res.Data.TotalProductAmount);
            Assert.Equal(100m, res.Data.TotalOtherExpenses);
            Assert.Equal(900m, res.Data.ActualAllIn);
            Assert.Equal(100m, res.Data.Variance);
        }

    }

    public class ProjectTasksControllerTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new SaoKimDBContext(options);
        }

        [Fact]
        public async Task GetTasks_ReturnsNotFound_WhenProjectMissing()
        {
            using var db = CreateDbContext();
            var controller = new ProjectTasksController(db);

            var result = await controller.GetTasks(1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
            Assert.Equal("Project not found", res.Message);
        }

        [Fact]
        public async Task GetTasks_ReturnsOk_WhenProjectExists()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Test" });
            db.TaskItems.Add(new TaskItem { Id = 1, ProjectId = 1, Name = "T1", StartDate = DateTime.UtcNow, DurationDays = 1 });
            await db.SaveChangesAsync();
            var controller = new ProjectTasksController(db);

            var result = await controller.GetTasks(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<IEnumerable<TaskDTO>>>(ok.Value);
            Assert.True(res.Success);
            Assert.Single(res.Data);
        }

        [Fact]
        public async Task GetTaskById_ReturnsNotFound_WhenMissing()
        {
            using var db = CreateDbContext();
            var controller = new ProjectTasksController(db);

            var result = await controller.GetTaskById(1, 1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
        }

        [Fact]
        public async Task GetTaskById_ReturnsOk_WhenFound()
        {
            using var db = CreateDbContext();
            db.TaskItems.Add(new TaskItem { Id = 1, ProjectId = 1, Name = "T1", StartDate = DateTime.UtcNow, DurationDays = 1 });
            await db.SaveChangesAsync();
            var controller = new ProjectTasksController(db);

            var result = await controller.GetTaskById(1, 1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<TaskDTO>>(ok.Value);
            Assert.True(res.Success);
            Assert.Equal(1, res.Data.Id);
        }

        [Fact]
        public async Task Create_ReturnsNotFound_WhenProjectMissing()
        {
            using var db = CreateDbContext();
            var controller = new ProjectTasksController(db);
            var dto = new TaskCreateUpdateDTO { Name = "T1", StartDate = DateTime.UtcNow, DurationDays = 1 };

            var result = await controller.Create(1, dto);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
        }

        [Fact]
        public async Task Create_CreatesTask_WhenProjectExists()
        {
            using var db = CreateDbContext();
            db.Projects.Add(new Project { Id = 1, Code = "P1", Name = "Test" });
            await db.SaveChangesAsync();
            var controller = new ProjectTasksController(db);
            var dto = new TaskCreateUpdateDTO { Name = "T1", StartDate = DateTime.UtcNow, DurationDays = 1 };

            var result = await controller.Create(1, dto);

            var created = Assert.IsType<CreatedAtActionResult>(result);
            var res = Assert.IsType<ApiResponse<TaskDTO>>(created.Value);
            Assert.True(res.Success);
            Assert.Equal("T1", res.Data.Name);
        }

        [Fact]
        public async Task Update_ReturnsNotFound_WhenTaskMissing()
        {
            using var db = CreateDbContext();
            var controller = new ProjectTasksController(db);
            var dto = new TaskCreateUpdateDTO { Name = "T1", StartDate = DateTime.UtcNow, DurationDays = 1 };

            var result = await controller.Update(1, 1, dto);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
        }

        [Fact]
        public async Task Update_UpdatesTask_WhenFound()
        {
            using var db = CreateDbContext();
            db.TaskItems.Add(new TaskItem { Id = 1, ProjectId = 1, Name = "Old", StartDate = DateTime.UtcNow, DurationDays = 1 });
            await db.SaveChangesAsync();
            var controller = new ProjectTasksController(db);
            var dto = new TaskCreateUpdateDTO { Name = "New", StartDate = DateTime.UtcNow, DurationDays = 3 };

            var result = await controller.Update(1, 1, dto);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(ok.Value);
            Assert.True(res.Success);
            Assert.Equal("Updated", res.Data);
        }

        [Fact]
        public async Task Delete_ReturnsNotFound_WhenMissing()
        {
            using var db = CreateDbContext();
            var controller = new ProjectTasksController(db);

            var result = await controller.Delete(1, 1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
        }

        [Fact]
        public async Task Delete_RemovesTask_WhenFound()
        {
            using var db = CreateDbContext();
            db.TaskItems.Add(new TaskItem { Id = 1, ProjectId = 1, Name = "T1", StartDate = DateTime.UtcNow, DurationDays = 1 });
            await db.SaveChangesAsync();
            var controller = new ProjectTasksController(db);

            var result = await controller.Delete(1, 1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(ok.Value);
            Assert.True(res.Success);
            Assert.Equal("Deleted", res.Data);
        }
    }

    public class ProjectsControllerTests
    {
        private class FakeProjectService : IProjectService
        {
            public Func<CreateProjectDTO, string, Task<ProjectResponseDTO>> CreateAsyncImpl { get; set; }
            public Func<int, Task<ProjectResponseDTO>> GetByIdAsyncImpl { get; set; }
            public Func<ProjectQuery, Task<PagedResult<ProjectResponseDTO>>> QueryAsyncImpl { get; set; }
            public Func<int, UpdateProjectDTO, string, Task<ProjectResponseDTO>> UpdateAsyncImpl { get; set; }
            public Func<int, Task<bool>> DeleteAsyncImpl { get; set; }

            public Task<ProjectResponseDTO> CreateAsync(CreateProjectDTO dto, string createdBy) => CreateAsyncImpl(dto, createdBy);
            public Task<ProjectResponseDTO> GetByIdAsync(int id) => GetByIdAsyncImpl(id);
            public Task<PagedResult<ProjectResponseDTO>> QueryAsync(ProjectQuery q) => QueryAsyncImpl(q);
            public Task<ProjectResponseDTO> UpdateAsync(int id, UpdateProjectDTO dto, string updatedBy) => UpdateAsyncImpl(id, dto, updatedBy);
            public Task<bool> DeleteAsync(int id) => DeleteAsyncImpl(id);
        }

        private ProjectsController CreateController(FakeProjectService service, string role = null, int? userId = null)
        {
            var controller = new ProjectsController(service);
            var http = new DefaultHttpContext();
            if (role != null || userId.HasValue)
            {
                var claims = new List<Claim>();
                if (role != null) claims.Add(new Claim(ClaimTypes.Role, role));
                if (userId.HasValue) claims.Add(new Claim("UserId", userId.Value.ToString()));
                var identity = new ClaimsIdentity(claims, "Test");
                http.User = new ClaimsPrincipal(identity);
            }
            controller.ControllerContext = new ControllerContext { HttpContext = http };
            return controller;
        }

        [Fact]
        public async Task Create_ReturnsValidationProblem_WhenModelInvalid()
        {
            var fake = new FakeProjectService();
            var controller = CreateController(fake);
            controller.ModelState.AddModelError("Name", "Required");

            var result = await controller.Create(new CreateProjectDTO());

            Assert.IsType<ObjectResult>(result);
        }

        [Fact]
        public async Task Create_ReturnsCreated_WhenSuccess()
        {
            var fake = new FakeProjectService
            {
                CreateAsyncImpl = (dto, by) => Task.FromResult(new ProjectResponseDTO { Id = 1, Name = dto.Name })
            };
            var controller = CreateController(fake);

            var result = await controller.Create(new CreateProjectDTO { Name = "P1" });

            var created = Assert.IsType<CreatedAtActionResult>(result);
            var res = Assert.IsType<ApiResponse<ProjectResponseDTO>>(created.Value);
            Assert.True(res.Success);
            Assert.Equal("P1", res.Data.Name);
        }

        [Fact]
        public async Task Create_ReturnsBadRequest_WhenArgumentException()
        {
            var fake = new FakeProjectService
            {
                CreateAsyncImpl = (dto, by) => throw new ArgumentException("Invalid")
            };
            var controller = CreateController(fake);

            var result = await controller.Create(new CreateProjectDTO { Name = "P1" });

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(br.Value);
            Assert.False(res.Success);
            Assert.Equal("Invalid", res.Message);
        }

        [Fact]
        public async Task Create_ReturnsConflict_WhenInvalidOperation()
        {
            var fake = new FakeProjectService
            {
                CreateAsyncImpl = (dto, by) => throw new InvalidOperationException("Dup code")
            };
            var controller = CreateController(fake);

            var result = await controller.Create(new CreateProjectDTO { Name = "P1" });

            var cf = Assert.IsType<ConflictObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(cf.Value);
            Assert.False(res.Success);
            Assert.Equal("Dup code", res.Message);
        }

        [Fact]
        public async Task GetById_ReturnsNotFound_WhenMissing()
        {
            var fake = new FakeProjectService
            {
                GetByIdAsyncImpl = id => Task.FromResult<ProjectResponseDTO>(null)
            };
            var controller = CreateController(fake);

            var result = await controller.GetById(1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
        }

        [Fact]
        public async Task GetById_ReturnsOk_WhenAdmin()
        {
            var fake = new FakeProjectService
            {
                GetByIdAsyncImpl = id => Task.FromResult(new ProjectResponseDTO { Id = id, Name = "P1" })
            };
            var controller = CreateController(fake, role: "admin");

            var result = await controller.GetById(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<ProjectResponseDTO>>(ok.Value);
            Assert.True(res.Success);
        }

        [Fact]
        public async Task GetById_Forbidden_WhenPmNotOwner()
        {
            var fake = new FakeProjectService
            {
                GetByIdAsyncImpl = id => Task.FromResult(new ProjectResponseDTO { Id = id, ProjectManagerId = 10 })
            };
            var controller = CreateController(fake, role: "project_manager", userId: 20);

            var result = await controller.GetById(1);

            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task GetById_Ok_WhenPmIsOwner()
        {
            var fake = new FakeProjectService
            {
                GetByIdAsyncImpl = id => Task.FromResult(new ProjectResponseDTO { Id = id, ProjectManagerId = 10 })
            };
            var controller = CreateController(fake, role: "project_manager", userId: 10);

            var result = await controller.GetById(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<ProjectResponseDTO>>(ok.Value);
            Assert.True(res.Success);
        }

        [Fact]
        public async Task Query_AddsPmFilter_WhenPmRole()
        {
            ProjectQuery captured = null;
            var fake = new FakeProjectService
            {
                QueryAsyncImpl = q =>
                {
                    captured = q;
                    return Task.FromResult(new PagedResult<ProjectResponseDTO> { Items = new List<ProjectResponseDTO>() });
                }
            };
            var controller = CreateController(fake, role: "pm", userId: 5);

            var result = await controller.Query(new ProjectQuery());

            Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(captured);
            Assert.Equal(5, captured.ProjectManagerId);
        }

        [Fact]
        public async Task Update_ReturnsValidationProblem_WhenModelInvalid()
        {
            var fake = new FakeProjectService();
            var controller = CreateController(fake);
            controller.ModelState.AddModelError("Name", "Required");

            var result = await controller.Update(1, new UpdateProjectDTO());

            Assert.IsType<ObjectResult>(result);
        }

        [Fact]
        public async Task Update_ReturnsNotFound_WhenServiceGetReturnsNull()
        {
            var fake = new FakeProjectService
            {
                GetByIdAsyncImpl = id => Task.FromResult<ProjectResponseDTO>(null)
            };
            var controller = CreateController(fake);

            var result = await controller.Update(1, new UpdateProjectDTO { Name = "New" });

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
            Assert.Equal("Project not found", res.Message);
        }

        [Fact]
        public async Task Update_ForbidsPmWhenNotOwner()
        {
            var fake = new FakeProjectService
            {
                GetByIdAsyncImpl = id => Task.FromResult(new ProjectResponseDTO { Id = id, ProjectManagerId = 10 }),
                UpdateAsyncImpl = (id, dto, by) => Task.FromResult<ProjectResponseDTO>(null)
            };
            var controller = CreateController(fake, role: "project_manager", userId: 5);

            var result = await controller.Update(1, new UpdateProjectDTO { Name = "New" });

            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task Update_RespectsPmCannotChangePmId()
        {
            var fake = new FakeProjectService
            {
                GetByIdAsyncImpl = id => Task.FromResult(new ProjectResponseDTO { Id = id, ProjectManagerId = 10 }),
                UpdateAsyncImpl = (id, dto, by) => Task.FromResult(new ProjectResponseDTO { Id = id, ProjectManagerId = dto.ProjectManagerId })
            };
            var controller = CreateController(fake, role: "project_manager", userId: 10);
            var dto = new UpdateProjectDTO { Name = "New", ProjectManagerId = 99 };

            var result = await controller.Update(1, dto);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<ProjectResponseDTO>>(ok.Value);
            Assert.Equal(10, res.Data.ProjectManagerId);
        }

        [Fact]
        public async Task Update_ReturnsBadRequest_WhenArgumentException()
        {
            var fake = new FakeProjectService
            {
                GetByIdAsyncImpl = id => Task.FromResult(new ProjectResponseDTO { Id = id }),
                UpdateAsyncImpl = (id, dto, by) => throw new ArgumentException("Invalid")
            };
            var controller = CreateController(fake);

            var result = await controller.Update(1, new UpdateProjectDTO { Name = "New" });

            var br = Assert.IsType<BadRequestObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(br.Value);
            Assert.False(res.Success);
            Assert.Equal("Invalid", res.Message);
        }

        [Fact]
        public async Task Delete_Forbids_WhenNotManager()
        {
            var fake = new FakeProjectService
            {
                DeleteAsyncImpl = id => Task.FromResult(false)
            };
            var controller = CreateController(fake, role: "project_manager", userId: 1);

            var result = await controller.Delete(1);

            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task Delete_ReturnsNotFound_WhenServiceReturnsFalse()
        {
            var fake = new FakeProjectService
            {
                DeleteAsyncImpl = id => Task.FromResult(false)
            };
            var controller = CreateController(fake, role: "manager");

            var result = await controller.Delete(1);

            var nf = Assert.IsType<NotFoundObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(nf.Value);
            Assert.False(res.Success);
            Assert.Equal("Project not found", res.Message);
        }

        [Fact]
        public async Task Delete_ReturnsOk_WhenManagerAndSuccess()
        {
            var fake = new FakeProjectService
            {
                DeleteAsyncImpl = id => Task.FromResult(true)
            };
            var controller = CreateController(fake, role: "manager");

            var result = await controller.Delete(1);

            var ok = Assert.IsType<OkObjectResult>(result);
            var res = Assert.IsType<ApiResponse<string>>(ok.Value);
            Assert.True(res.Success);
            Assert.Equal("Deleted", res.Data);
        }
    }
}
