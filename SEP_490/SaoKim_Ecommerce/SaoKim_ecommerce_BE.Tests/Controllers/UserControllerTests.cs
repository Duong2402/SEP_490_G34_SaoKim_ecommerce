using System;
using System.Collections;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using Xunit;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
	public class UsersControllerTests
	{
		private SaoKimDBContext CreateDbContext()
		{
			var options = new DbContextOptionsBuilder<SaoKimDBContext>()
				.UseInMemoryDatabase(Guid.NewGuid().ToString())
				.Options;

			return new SaoKimDBContext(options);
		}

		private UsersController CreateController(SaoKimDBContext db, string? email = null)
		{
			var controller = new UsersController(db);
			var httpContext = new DefaultHttpContext();

			if (!string.IsNullOrEmpty(email))
			{
				var identity = new ClaimsIdentity(
					new[] { new Claim(ClaimTypes.Name, email) },
					"TestAuth");
				httpContext.User = new ClaimsPrincipal(identity);
			}

			controller.ControllerContext = new ControllerContext
			{
				HttpContext = httpContext
			};

			return controller;
		}

		#region GetAll

		[Fact]
		public async Task GetAll_ReturnsOk_WithPagingEnvelope()
		{
			using var db = CreateDbContext();
			db.Users.Add(new User { UserID = 1, Name = "A", Email = "a@x.com", CreateAt = DateTime.UtcNow });
			await db.SaveChangesAsync();

			var controller = CreateController(db);

			var result = await controller.GetAll(null, null, null, 1, 20);

			var ok = Assert.IsType<OkObjectResult>(result);
			Assert.NotNull(ok.Value);

			var valueType = ok.Value!.GetType();
			Assert.NotNull(valueType.GetProperty("items"));
			Assert.NotNull(valueType.GetProperty("total"));
			Assert.NotNull(valueType.GetProperty("page"));
			Assert.NotNull(valueType.GetProperty("pageSize"));
			Assert.NotNull(valueType.GetProperty("totalPages"));
		}

		[Fact]
		public async Task GetAll_FiltersByRole()
		{
			using var db = CreateDbContext();
			var roleAdmin = new Role { RoleId = 1, Name = "admin" };
			var roleStaff = new Role { RoleId = 2, Name = "staff" };

			db.Roles.AddRange(roleAdmin, roleStaff);
			db.Users.AddRange(
				new User { UserID = 1, Name = "Admin1", Role = roleAdmin, CreateAt = DateTime.UtcNow },
				new User { UserID = 2, Name = "Staff1", Role = roleStaff, CreateAt = DateTime.UtcNow }
			);
			await db.SaveChangesAsync();

			var controller = CreateController(db);

			var result = await controller.GetAll(null, "admin", null, 1, 20);

			var ok = Assert.IsType<OkObjectResult>(result);
			var valueType = ok.Value!.GetType();
			var itemsProp = valueType.GetProperty("items")!;
			var items = (IList)itemsProp.GetValue(ok.Value)!;

			Assert.Single(items);
		}

		[Fact]
		public async Task GetAll_FiltersByRoleAndStatus()
		{
			using var db = CreateDbContext();
			var roleAdmin = new Role { RoleId = 1, Name = "admin" };
			var roleStaff = new Role { RoleId = 2, Name = "staff" };
			db.Roles.AddRange(roleAdmin, roleStaff);

			db.Users.AddRange(
				new User { UserID = 1, Name = "AdminActive", Role = roleAdmin, Status = "Active", CreateAt = DateTime.UtcNow },
				new User { UserID = 2, Name = "AdminInactive", Role = roleAdmin, Status = "Inactive", CreateAt = DateTime.UtcNow },
				new User { UserID = 3, Name = "StaffActive", Role = roleStaff, Status = "Active", CreateAt = DateTime.UtcNow }
			);
			await db.SaveChangesAsync();

			var controller = CreateController(db);

			var result = await controller.GetAll(null, "admin", "Active", 1, 20);

			var ok = Assert.IsType<OkObjectResult>(result);
			var itemsProp = ok.Value!.GetType().GetProperty("items")!;
			var items = (IList)itemsProp.GetValue(ok.Value)!;

			Assert.Single(items);
		}

		[Fact]
		public async Task GetAll_NormalizesNegativePageToOne()
		{
			using var db = CreateDbContext();
			db.Users.Add(new User { UserID = 1, Name = "U1", CreateAt = DateTime.UtcNow });
			await db.SaveChangesAsync();

			var controller = CreateController(db);

			var result = await controller.GetAll(null, null, null, -5, 20);

			var ok = Assert.IsType<OkObjectResult>(result);
			var pageProp = ok.Value!.GetType().GetProperty("page")!;
			var pageValue = (int)pageProp.GetValue(ok.Value)!;

			Assert.Equal(1, pageValue);
		}

		[Fact]
		public async Task GetAll_ReturnsEmpty_WhenNoUsers()
		{
			using var db = CreateDbContext();
			var controller = CreateController(db);

			var result = await controller.GetAll(null, null, null, 1, 20);

			var ok = Assert.IsType<OkObjectResult>(result);
			var itemsProp = ok.Value!.GetType().GetProperty("items")!;
			var items = (IList)itemsProp.GetValue(ok.Value)!;
			var totalProp = ok.Value!.GetType().GetProperty("total")!;
			var total = (int)totalProp.GetValue(ok.Value)!;

			Assert.Empty(items);
			Assert.Equal(0, total);
		}

		#endregion

		#region GetProjectManagers

		[Fact]
		public async Task GetProjectManagers_ReturnsOnlyProjectManagers()
		{
			using var db = CreateDbContext();
			var pmRole = new Role { RoleId = 1, Name = "project_manager" };
			var otherRole = new Role { RoleId = 2, Name = "staff" };
			db.Roles.AddRange(pmRole, otherRole);

			db.Users.AddRange(
				new User { UserID = 1, Name = "PM1", Email = "pm1@x.com", Role = pmRole },
				new User { UserID = 2, Name = "Staff1", Email = "s1@x.com", Role = otherRole }
			);
			await db.SaveChangesAsync();

			var controller = CreateController(db);

			var result = await controller.GetProjectManagers();

			var ok = Assert.IsType<OkObjectResult>(result);
			var list = Assert.IsAssignableFrom<System.Collections.Generic.List<ProjectManagerOptionDTO>>(ok.Value);

			Assert.Single(list);
			Assert.Equal("PM1", list[0].Name);
		}

		[Fact]
		public async Task GetProjectManagers_OrdersByNameAscending()
		{
			using var db = CreateDbContext();
			var pmRole = new Role { RoleId = 1, Name = "project_manager" };
			db.Roles.Add(pmRole);

			db.Users.AddRange(
				new User { UserID = 1, Name = "Charlie", Email = "c@x.com", Role = pmRole },
				new User { UserID = 2, Name = "Alice", Email = "a@x.com", Role = pmRole }
			);
			await db.SaveChangesAsync();

			var controller = CreateController(db);

			var result = await controller.GetProjectManagers();

			var ok = Assert.IsType<OkObjectResult>(result);
			var list = Assert.IsAssignableFrom<System.Collections.Generic.List<ProjectManagerOptionDTO>>(ok.Value);

			Assert.Equal(2, list.Count);
			Assert.Equal("Alice", list[0].Name);
			Assert.Equal("Charlie", list[1].Name);
		}

		#endregion

		#region GetById

		[Fact]
		public async Task GetById_ReturnsNotFound_WhenUserNotExist()
		{
			using var db = CreateDbContext();
			var controller = CreateController(db);

			var result = await controller.GetById(1);

			Assert.IsType<NotFoundObjectResult>(result);
		}

		[Fact]
		public async Task GetById_ReturnsUserData_WhenUserExists()
		{
			using var db = CreateDbContext();
			var role = new Role { RoleId = 1, Name = "admin" };
			db.Roles.Add(role);
			db.Users.Add(new User
			{
				UserID = 1,
				Name = "User1",
				Email = "u1@x.com",
				PhoneNumber = "123",
				Role = role,
				Status = "Active",
				Address = "Addr",
				DOB = new DateTime(2000, 1, 1),
				Image = "/img.png",
				CreateAt = DateTime.UtcNow
			});
			await db.SaveChangesAsync();

			var controller = CreateController(db);

			var result = await controller.GetById(1);

			var ok = Assert.IsType<OkObjectResult>(result);
			var valueType = ok.Value!.GetType();
			Assert.NotNull(valueType.GetProperty("id"));
			Assert.NotNull(valueType.GetProperty("name"));
			Assert.NotNull(valueType.GetProperty("role"));
		}

		#endregion

		#region UpdateUser

		[Fact]
		public async Task UpdateUser_ReturnsNotFound_WhenUserNotExist()
		{
			using var db = CreateDbContext();
			var controller = CreateController(db);
			var dto = new UsersController.UserUpdateDto { Name = "New" };

			var result = await controller.UpdateUser(1, dto);

			Assert.IsType<NotFoundObjectResult>(result);
		}

		[Fact]
		public async Task UpdateUser_UpdatesOnlyProvidedFields()
		{
			using var db = CreateDbContext();
			var role = new Role { RoleId = 1, Name = "staff" };
			db.Roles.Add(role);
			var user = new User
			{
				UserID = 1,
				Name = "Old Name",
				Address = "Old Addr",
				PhoneNumber = "111",
				Status = "Active",
				DOB = new DateTime(2000, 1, 1),
				RoleId = 1,
				CreateAt = DateTime.UtcNow
			};
			db.Users.Add(user);
			await db.SaveChangesAsync();

			var controller = CreateController(db);
			var dto = new UsersController.UserUpdateDto
			{
				Name = "New Name",
				Address = "New Addr",
				PhoneNumber = "222"
			};

			var result = await controller.UpdateUser(1, dto);

			Assert.IsType<OkObjectResult>(result);

			var updated = await db.Users.FirstAsync(u => u.UserID == 1);
			Assert.Equal("New Name", updated.Name);
			Assert.Equal("New Addr", updated.Address);
			Assert.Equal("222", updated.PhoneNumber);
			Assert.Equal("Active", updated.Status);
			Assert.Equal(new DateTime(2000, 1, 1), updated.DOB);
		}

		[Fact]
		public async Task UpdateUser_UpdatesRoleId_WhenProvided()
		{
			using var db = CreateDbContext();
			var role1 = new Role { RoleId = 1, Name = "staff" };
			var role2 = new Role { RoleId = 2, Name = "admin" };
			db.Roles.AddRange(role1, role2);

			var user = new User
			{
				UserID = 1,
				Name = "U1",
				RoleId = 1,
				CreateAt = DateTime.UtcNow
			};
			db.Users.Add(user);
			await db.SaveChangesAsync();

			var controller = CreateController(db);
			var dto = new UsersController.UserUpdateDto
			{
				RoleId = 2
			};

			var result = await controller.UpdateUser(1, dto);

			Assert.IsType<OkObjectResult>(result);

			var updated = await db.Users.FirstAsync(u => u.UserID == 1);
			Assert.Equal(2, updated.RoleId);
		}

		#endregion

		#region GetRoles

		[Fact]
		public async Task GetRoles_ReturnsAllRolesOrderedByName()
		{
			using var db = CreateDbContext();
			db.Roles.AddRange(
				new Role { RoleId = 1, Name = "staff" },
				new Role { RoleId = 2, Name = "admin" }
			);
			await db.SaveChangesAsync();

			var controller = CreateController(db);

			var result = await controller.GetRoles();

			var ok = Assert.IsType<OkObjectResult>(result);
			var list = Assert.IsAssignableFrom<IList>(ok.Value);

			Assert.Equal(2, list.Count);

			var first = list[0]!;
			var firstName = (string)first.GetType().GetProperty("name")!.GetValue(first)!;
			Assert.Equal("admin", firstName);
		}

		#endregion

		#region GetMe

		[Fact]
		public async Task GetMe_ReturnsUnauthorized_WhenNoUserIdentity()
		{
			using var db = CreateDbContext();
			var controller = CreateController(db, email: null);

			var result = await controller.GetMe();

			Assert.IsType<UnauthorizedObjectResult>(result);
		}

		[Fact]
		public async Task GetMe_ReturnsNotFound_WhenUserNotExist()
		{
			using var db = CreateDbContext();
			var controller = CreateController(db, "u1@x.com");

			var result = await controller.GetMe();

			Assert.IsType<NotFoundObjectResult>(result);
		}

		[Fact]
		public async Task GetMe_ReturnsCurrentUserProfile()
		{
			using var db = CreateDbContext();
			var role = new Role { RoleId = 1, Name = "staff" };
			db.Roles.Add(role);

			db.Users.Add(new User
			{
				UserID = 1,
				Name = "User1",
				Email = "u1@x.com",
				Role = role,
				CreateAt = DateTime.UtcNow
			});
			await db.SaveChangesAsync();

			var controller = CreateController(db, "u1@x.com");

			var result = await controller.GetMe();

			var ok = Assert.IsType<OkObjectResult>(result);
			var valueType = ok.Value!.GetType();
			Assert.NotNull(valueType.GetProperty("id"));
			Assert.NotNull(valueType.GetProperty("email"));
			Assert.NotNull(valueType.GetProperty("role"));
		}

		#endregion

		#region UpdateMe

		[Fact]
		public async Task UpdateMe_ReturnsUnauthorized_WhenNoIdentity()
		{
			using var db = CreateDbContext();
			var controller = CreateController(db, null);

			var dto = new UsersController.UpdateProfileDto
			{
				Name = "New"
			};

			var result = await controller.UpdateMe(dto);

			Assert.IsType<UnauthorizedObjectResult>(result);
		}

		[Fact]
		public async Task UpdateMe_ReturnsNotFound_WhenUserNotExist()
		{
			using var db = CreateDbContext();
			var controller = CreateController(db, "u1@x.com");

			var dto = new UsersController.UpdateProfileDto
			{
				Name = "New"
			};

			var result = await controller.UpdateMe(dto);

			Assert.IsType<NotFoundObjectResult>(result);
		}

		[Fact]
		public async Task UpdateMe_UpdatesProfileFields()
		{
			using var db = CreateDbContext();
			db.Users.Add(new User
			{
				UserID = 1,
				Email = "u1@x.com",
				Name = "Old",
				Address = "OldAddr",
				PhoneNumber = "111",
				DOB = new DateTime(2000, 1, 1),
				CreateAt = DateTime.UtcNow
			});
			await db.SaveChangesAsync();

			var controller = CreateController(db, "u1@x.com");

			var dto = new UsersController.UpdateProfileDto
			{
				Name = "NewName",
				Address = "NewAddr",
				PhoneNumber = "222",
				Dob = new DateTime(1999, 1, 1)
			};

			var result = await controller.UpdateMe(dto);

			Assert.IsType<OkObjectResult>(result);

			var updated = await db.Users.FirstAsync(u => u.Email == "u1@x.com");
			Assert.Equal("NewName", updated.Name);
			Assert.Equal("NewAddr", updated.Address);
			Assert.Equal("222", updated.PhoneNumber);
			Assert.Equal(new DateTime(1999, 1, 1), updated.DOB);
		}

		[Fact]
		public async Task UpdateMe_SavesImage_WhenProvided()
		{
			using var db = CreateDbContext();
			db.Users.Add(new User
			{
				UserID = 1,
				Email = "u1@x.com",
				Name = "User1",
				CreateAt = DateTime.UtcNow
			});
			await db.SaveChangesAsync();

			var controller = CreateController(db, "u1@x.com");

			var stream = new System.IO.MemoryStream(new byte[] { 1, 2, 3 });
			var file = new FormFile(stream, 0, stream.Length, "Image", "avatar.png");

			var dto = new UsersController.UpdateProfileDto
			{
				Image = file
			};

			var result = await controller.UpdateMe(dto);

			Assert.IsType<OkObjectResult>(result);

			var updated = await db.Users.FirstAsync(u => u.Email == "u1@x.com");
			Assert.False(string.IsNullOrWhiteSpace(updated.Image));
			Assert.StartsWith("/uploads/avatars/", updated.Image);
		}

		#endregion
	}
}
