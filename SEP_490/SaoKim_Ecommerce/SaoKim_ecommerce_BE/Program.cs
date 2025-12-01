using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using QuestPDF.Infrastructure;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Hubs;
using SaoKim_ecommerce_BE.Services;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;


var builder = WebApplication.CreateBuilder(args);
QuestPDF.Settings.License = LicenseType.Community;

// SignalR
builder.Services.AddSignalR();

// Controllers + JSON
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// Swagger + JWT security
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "SaoKim_ecommerce_BE",
        Version = "v1"
    });

    // Định nghĩa Bearer dạng HTTP (Swagger sẽ tự thêm "Bearer " vào header)
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Bearer. Chỉ cần dán token (không cần chữ 'Bearer').",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    });

    // Áp dụng security cho tất cả endpoint
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddMemoryCache();

// DI services
builder.Services.AddScoped<IPasswordResetService, PasswordResetService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IProjectProductService, ProjectProductService>();
builder.Services.AddScoped<IProjectExpenseService, ProjectExpenseService>();
builder.Services.AddScoped<IPromotionService, PromotionService>();
builder.Services.AddScoped<ICouponService, CouponService>();
builder.Services.AddScoped<IReceivingService, ReceivingService>();
builder.Services.AddScoped<IDispatchService, DispatchService>();
builder.Services.AddScoped<IWarehouseReportService, WarehouseReportService>();


// DbContext
builder.Services.AddDbContext<SaoKimDBContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// CORS
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFE", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()
              .SetPreflightMaxAge(TimeSpan.FromHours(1));
    });
});

// JWT Auth
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var key = builder.Configuration["Jwt:Key"];
        var issuer = builder.Configuration["Jwt:Issuer"];
        var audience = builder.Configuration["Jwt:Audience"];

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                // Cho phép truyền token qua query cho SignalR
                if (!string.IsNullOrEmpty(accessToken) &&
                    path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
            OnChallenge = ctx =>
            {
                ctx.HandleResponse();
                if (!ctx.Response.HasStarted)
                {
                    ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    ctx.Response.ContentType = "application/json; charset=utf-8";
                    return ctx.Response.WriteAsync("{\"message\":\"Unauthorized\"}");
                }
                return Task.CompletedTask;
            },
            OnForbidden = ctx =>
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                ctx.Response.ContentType = "application/json; charset=utf-8";
                return ctx.Response.WriteAsync("{\"message\":\"Forbidden\"}");
            }
        };
    });

// Authorization: mặc định yêu cầu đăng nhập
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

var app = builder.Build();

// Migrate + seed DB
var fontPath = Path.Combine(builder.Environment.WebRootPath ?? "wwwroot", "fonts", "NotoSans-Regular.ttf");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SaoKimDBContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db);
}

// Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

app.MapGet("/__routes", (EndpointDataSource eds) =>
    Results.Json(eds.Endpoints.Select(e => e.DisplayName)));

app.UseStaticFiles();
app.UseHttpsRedirection();

app.UseRouting();

app.UseCors("AllowFE");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHub<DispatchHub>("/hubs/dispatch");
app.MapHub<ReceivingHub>("/hubs/receiving");
app.MapHub<InventoryHub>("/hubs/inventory");

app.Run();
