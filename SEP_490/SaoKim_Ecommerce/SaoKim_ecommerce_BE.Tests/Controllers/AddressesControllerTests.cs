using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SaoKim_ecommerce_BE.Controllers;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models.Requests;
using Xunit;

namespace SaoKim_ecommerce_BE.Tests.Controllers
{
    public class AddressesControllerTests
    {
        private SaoKimDBContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<SaoKimDBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new SaoKimDBContext(options);
        }

        private AddressesController CreateController(
            SaoKimDBContext db,
            int? userId = 1,
            string apiKey = "",
            HttpMessageHandler handler = null)
        {
            var dict = new Dictionary<string, string>();
            if (apiKey != null)
                dict["GoogleMaps:ApiKey"] = apiKey;

            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(dict)
                .Build();

            var httpHandler = handler ?? new StubMessageHandler(_ =>
                new HttpResponseMessage(HttpStatusCode.BadRequest)
                {
                    Content = new StringContent(
                        "{\"status\":\"ZERO_RESULTS\",\"results\":[]}",
                        Encoding.UTF8,
                        "application/json")
                });

            var client = new HttpClient(httpHandler);
            var httpFactory = new TestHttpClientFactory(client);
            var loggerFactory = LoggerFactory.Create(b => { });
            var logger = loggerFactory.CreateLogger<AddressesController>();

            var controller = new AddressesController(db, config, httpFactory, logger);

            var httpContext = new DefaultHttpContext();
            if (userId.HasValue)
            {
                httpContext.User = new ClaimsPrincipal(
                    new ClaimsIdentity(
                        new[] { new Claim("UserId", userId.Value.ToString()) },
                        "TestAuth"));
            }

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };

            return controller;
        }

        private class TestHttpClientFactory : IHttpClientFactory
        {
            private readonly HttpClient _client;
            public TestHttpClientFactory(HttpClient client)
            {
                _client = client;
            }
            public HttpClient CreateClient(string name) => _client;
        }

        private class StubMessageHandler : HttpMessageHandler
        {
            private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;
            public StubMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
            {
                _handler = handler;
            }
            protected override Task<HttpResponseMessage> SendAsync(
                HttpRequestMessage request,
                CancellationToken cancellationToken)
            {
                return Task.FromResult(_handler(request));
            }
        }

        private CreateAddressRequest MakeCreateRequest(
            bool isDefault = false,
            double? lat = null,
            double? lng = null)
        {
            return new CreateAddressRequest
            {
                RecipientName = "Name",
                PhoneNumber = "0123456789",
                Line1 = "Line 1",
                Ward = "Ward",
                District = "District",
                Province = "Province",
                IsDefault = isDefault,
                Latitude = lat,
                Longitude = lng
            };
        }

        private AddressUpdateRequest MakeUpdateRequest(
            bool isDefault = false,
            double? lat = null,
            double? lng = null)
        {
            return new AddressUpdateRequest
            {
                RecipientName = "New Name",
                PhoneNumber = "0999999999",
                Line1 = "New Line 1",
                Ward = "New Ward",
                District = "New District",
                Province = "New Province",
                IsDefault = isDefault,
                Latitude = lat,
                Longitude = lng
            };
        }

        [Fact]
        public async Task GetMine_ReturnsUnauthorized_WhenUserIdMissing()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db, userId: null);
            var result = await controller.GetMine();
            Assert.IsType<UnauthorizedResult>(result);
        }

        [Fact]
        public async Task GetMine_ReturnsEmptyList_WhenNoAddresses()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db, 1);
            var result = await controller.GetMine();
            var ok = Assert.IsType<OkObjectResult>(result);
            var list = Assert.IsType<List<AddressResponse>>(ok.Value);
            Assert.Empty(list);
        }

        [Fact]
        public async Task GetMine_ReturnsUserAddressesOnly()
        {
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;

            db.Addresses.AddRange(
                new Address { UserId = 1, Line1 = "U1-A", Ward = "W", District = "D", Province = "P", CreateAt = now },
                new Address { UserId = 2, Line1 = "U2-A", Ward = "W", District = "D", Province = "P", CreateAt = now },
                new Address { UserId = 1, Line1 = "U1-B", Ward = "W", District = "D", Province = "P", CreateAt = now }
            );
            await db.SaveChangesAsync();

            var controller = CreateController(db, 1);
            var result = await controller.GetMine();

            var ok = Assert.IsType<OkObjectResult>(result);
            var list = Assert.IsType<List<AddressResponse>>(ok.Value);
            Assert.Equal(2, list.Count);
            Assert.All(list, x => Assert.StartsWith("U1-", x.Line1));
        }

        [Fact]
        public async Task GetMine_OrdersByDefaultThenCreateAt()
        {
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;

            db.Addresses.AddRange(
                new Address { UserId = 1, Line1 = "A", CreateAt = now.AddMinutes(-30) },
                new Address { UserId = 1, Line1 = "B", CreateAt = now.AddMinutes(-20), IsDefault = true },
                new Address { UserId = 1, Line1 = "C", CreateAt = now.AddMinutes(-10), IsDefault = true }
            );
            await db.SaveChangesAsync();

            var controller = CreateController(db, 1);
            var result = await controller.GetMine();

            var ok = Assert.IsType<OkObjectResult>(result);
            var list = Assert.IsType<List<AddressResponse>>(ok.Value);

            Assert.Equal(new[] { "C", "B", "A" }, list.Select(x => x.Line1).ToArray());
        }

        [Fact]
        public async Task Create_ReturnsUnauthorized_WhenUserIdMissing()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db, userId: null);
            var req = MakeCreateRequest();
            var result = await controller.Create(req);
            Assert.IsType<UnauthorizedResult>(result);
        }

        [Fact]
        public async Task Create_CreatesNonDefaultAddress()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db, 1);
            var req = MakeCreateRequest(isDefault: false);
            var result = await controller.Create(req);
            Assert.IsType<OkObjectResult>(result);

            var entity = await db.Addresses.SingleAsync();
            Assert.False(entity.IsDefault);
            Assert.Equal("Name", entity.RecipientName);
        }

        [Fact]
        public async Task Create_FirstAddressIsDefaultWhenRequested()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db, 1);
            var req = MakeCreateRequest(isDefault: true);
            var result = await controller.Create(req);
            Assert.IsType<OkObjectResult>(result);

            var entity = await db.Addresses.SingleAsync();
            Assert.True(entity.IsDefault);
        }

        [Fact]
        public async Task Create_SetsNewDefaultAndClearsOldDefault()
        {
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;

            db.Addresses.Add(new Address { UserId = 1, RecipientName = "Old Default", IsDefault = true, CreateAt = now });
            await db.SaveChangesAsync();

            var controller = CreateController(db, 1);
            var req = MakeCreateRequest(isDefault: true);
            var result = await controller.Create(req);

            Assert.IsType<OkObjectResult>(result);

            var all = await db.Addresses.ToListAsync();
            Assert.Single(all.Where(a => a.IsDefault));
            Assert.Equal("Name", all.Single(a => a.IsDefault).RecipientName);
        }

        [Fact]
        public async Task Create_DoesNotClearExistingDefault_WhenIsDefaultFalse()
        {
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;

            db.Addresses.Add(new Address { UserId = 1, RecipientName = "Old Default", IsDefault = true, CreateAt = now });
            await db.SaveChangesAsync();

            var controller = CreateController(db, 1);
            var req = MakeCreateRequest(isDefault: false);
            var result = await controller.Create(req);

            Assert.IsType<OkObjectResult>(result);
            var all = await db.Addresses.ToListAsync();

            Assert.Single(all.Where(a => a.IsDefault));
            Assert.Equal("Old Default", all.Single(a => a.IsDefault).RecipientName);
        }

        [Fact]
        public async Task Create_UsesProvidedLatLngWithoutGeocoding()
        {
            using var db = CreateDbContext();
            var handler = new StubMessageHandler(_ => throw new InvalidOperationException("Should not call geocode"));

            var controller = CreateController(db, 1, apiKey: "dummy", handler: handler);
            var req = MakeCreateRequest(lat: 10.1, lng: 20.2);

            var result = await controller.Create(req);

            Assert.IsType<OkObjectResult>(result);
            var entity = await db.Addresses.SingleAsync();
            Assert.Equal(10.1, entity.Latitude);
            Assert.Equal(20.2, entity.Longitude);
        }

        [Fact]
        public async Task Create_UsesGeocodingWhenLatLngMissing()
        {
            using var db = CreateDbContext();

            var json = "{\"status\":\"OK\",\"results\":[{\"geometry\":{\"location\":{\"lat\":11.11,\"lng\":22.22}}}]}";
            var handler = new StubMessageHandler(_ =>
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(json, Encoding.UTF8, "application/json")
                });

            var controller = CreateController(db, 1, apiKey: "dummy", handler: handler);
            var req = MakeCreateRequest(lat: null, lng: null);

            var result = await controller.Create(req);

            Assert.IsType<OkObjectResult>(result);
            var entity = await db.Addresses.SingleAsync();

            Assert.Equal(11.11, entity.Latitude);
            Assert.Equal(22.22, entity.Longitude);
        }

        [Fact]
        public async Task Create_ReturnsResponsePayload()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db, 1);
            var req = MakeCreateRequest(isDefault: true);
            var result = await controller.Create(req);

            var ok = Assert.IsType<OkObjectResult>(result);
            var value = ok.Value;
            var type = value.GetType();

            Assert.Equal("Name", type.GetProperty("recipientName")!.GetValue(value));
            Assert.True((bool)type.GetProperty("isDefault")!.GetValue(value));
        }

        [Fact]
        public async Task Update_ReturnsUnauthorized_WhenUserIdMissing()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db, userId: null);

            var req = MakeUpdateRequest();
            var result = await controller.Update(1, req);

            Assert.IsType<UnauthorizedResult>(result);
        }

        [Fact]
        public async Task Update_ReturnsNotFound_WhenAddressNotOwnedByUser()
        {
            using var db = CreateDbContext();
            db.Addresses.Add(new Address { UserId = 2, Line1 = "L", Ward = "W", District = "D", Province = "P" });
            await db.SaveChangesAsync();

            var addr = await db.Addresses.SingleAsync();

            var controller = CreateController(db, 1);
            var req = MakeUpdateRequest();

            var result = await controller.Update(addr.AddressId, req);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task Update_UpdatesBasicFields()
        {
            using var db = CreateDbContext();
            db.Addresses.Add(new Address
            {
                UserId = 1,
                RecipientName = "Old Name",
                PhoneNumber = "111",
                Line1 = "Old Line",
                Ward = "Old Ward",
                District = "Old District",
                Province = "Old Province",
                CreateAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            var entity = await db.Addresses.SingleAsync();
            var controller = CreateController(db, 1);
            var req = MakeUpdateRequest(isDefault: false, lat: 9.9, lng: 8.8);

            var result = await controller.Update(entity.AddressId, req);

            Assert.IsType<OkResult>(result);

            var updated = await db.Addresses.SingleAsync();
            Assert.Equal("New Name", updated.RecipientName);
            Assert.Equal("0999999999", updated.PhoneNumber);
            Assert.Equal("New Line 1", updated.Line1);
            Assert.Equal("New Ward", updated.Ward);
            Assert.Equal("New District", updated.District);
            Assert.Equal("New Province", updated.Province);
            Assert.False(updated.IsDefault);
            Assert.Equal(9.9, updated.Latitude);
            Assert.Equal(8.8, updated.Longitude);
            Assert.NotNull(updated.UpdateAt);
        }

        [Fact]
        public async Task Update_SetDefaultClearsOldDefault()
        {
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;

            var addr1 = new Address { UserId = 1, RecipientName = "Old Default", IsDefault = true, CreateAt = now };
            var addr2 = new Address { UserId = 1, RecipientName = "Second", CreateAt = now.AddMinutes(1) };

            db.Addresses.AddRange(addr1, addr2);
            await db.SaveChangesAsync();

            var controller = CreateController(db, 1);
            var req = MakeUpdateRequest(isDefault: true);

            var result = await controller.Update(addr2.AddressId, req);

            Assert.IsType<OkResult>(result);

            var all = await db.Addresses.ToListAsync();
            Assert.Single(all.Where(a => a.IsDefault));
            Assert.Equal("New Name", all.Single(a => a.IsDefault).RecipientName);
        }

        [Fact]
        public async Task Update_DoesNotChangeDefaultWhenIsDefaultFalse()
        {
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;

            var addr1 = new Address { UserId = 1, RecipientName = "Default", IsDefault = true, CreateAt = now };
            var addr2 = new Address { UserId = 1, RecipientName = "Second", CreateAt = now.AddMinutes(1) };

            db.Addresses.AddRange(addr1, addr2);
            await db.SaveChangesAsync();

            var controller = CreateController(db, 1);
            var req = MakeUpdateRequest(isDefault: false);

            var result = await controller.Update(addr2.AddressId, req);

            Assert.IsType<OkResult>(result);

            var all = await db.Addresses.ToListAsync();
            Assert.Single(all.Where(a => a.IsDefault));
            Assert.Equal("Default", all.Single(a => a.IsDefault).RecipientName);
        }

        [Fact]
        public async Task Update_UsesGeocodingWhenLatLngMissing()
        {
            using var db = CreateDbContext();

            var addr = new Address
            {
                UserId = 1,
                Line1 = "Old",
                Ward = "W",
                District = "D",
                Province = "P",
                Latitude = null,
                Longitude = null,
                CreateAt = DateTime.UtcNow
            };
            db.Addresses.Add(addr);
            await db.SaveChangesAsync();

            var json = "{\"status\":\"OK\",\"results\":[{\"geometry\":{\"location\":{\"lat\":55.55,\"lng\":66.66}}}]}";
            var handler = new StubMessageHandler(_ =>
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(json, Encoding.UTF8, "application/json")
                });

            var controller = CreateController(db, 1, "dummy", handler);
            var req = MakeUpdateRequest(lat: null, lng: null);

            var result = await controller.Update(addr.AddressId, req);

            Assert.IsType<OkResult>(result);

            var updated = await db.Addresses.SingleAsync();
            Assert.Equal(55.55, updated.Latitude);
            Assert.Equal(66.66, updated.Longitude);
        }

        [Fact]
        public async Task SetDefault_ReturnsUnauthorized_WhenUserIdMissing()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db, null);
            var result = await controller.SetDefault(1);
            Assert.IsType<UnauthorizedResult>(result);
        }

        [Fact]
        public async Task SetDefault_ReturnsNotFound_WhenAddressNotOwned()
        {
            using var db = CreateDbContext();
            db.Addresses.Add(new Address { UserId = 2, Line1 = "L" });
            await db.SaveChangesAsync();

            var addr = await db.Addresses.SingleAsync();
            var controller = CreateController(db, 1);

            var result = await controller.SetDefault(addr.AddressId);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task SetDefault_UpdatesDefaultFlags()
        {
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;

            var addr1 = new Address { UserId = 1, RecipientName = "Default", IsDefault = true, CreateAt = now };
            var addr2 = new Address { UserId = 1, RecipientName = "Second", CreateAt = now.AddMinutes(1) };

            db.Addresses.AddRange(addr1, addr2);
            await db.SaveChangesAsync();

            var controller = CreateController(db, 1);

            var result = await controller.SetDefault(addr2.AddressId);

            Assert.IsType<OkResult>(result);

            var all = await db.Addresses.ToListAsync();
            Assert.Single(all.Where(a => a.IsDefault));
            Assert.Equal("Second", all.Single(a => a.IsDefault).RecipientName);
        }

        [Fact]
        public async Task Delete_ReturnsUnauthorized_WhenUserIdMissing()
        {
            using var db = CreateDbContext();
            var controller = CreateController(db, null);

            var result = await controller.Delete(1);

            Assert.IsType<UnauthorizedResult>(result);
        }

        [Fact]
        public async Task Delete_ReturnsNotFound_WhenAddressNotOwned()
        {
            using var db = CreateDbContext();
            db.Addresses.Add(new Address { UserId = 2, Line1 = "L" });
            await db.SaveChangesAsync();

            var addr = await db.Addresses.SingleAsync();
            var controller = CreateController(db, 1);

            var result = await controller.Delete(addr.AddressId);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task Delete_RemovesAddress()
        {
            using var db = CreateDbContext();
            db.Addresses.Add(new Address { UserId = 1, Line1 = "Mine" });
            await db.SaveChangesAsync();

            var addr = await db.Addresses.SingleAsync();
            var controller = CreateController(db, 1);

            var result = await controller.Delete(addr.AddressId);

            Assert.IsType<OkResult>(result);
            Assert.Empty(db.Addresses);
        }
    }
}
