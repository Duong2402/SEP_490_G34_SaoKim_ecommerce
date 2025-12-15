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

// Configure QuestPDF community license (required before using QuestPDF)
QuestPDF.Settings.License = LicenseType.Community;

// Register SignalR hubs (for real-time notifications)
builder.Services.AddSignalR();

// Add controllers and configure System.Text.Json options
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        // Use camelCase for JSON properties
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // Serialize enums as strings instead of numeric values
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        // Allow case-insensitive matching for JSON property names
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

// Swagger configuration with JWT Bearer authentication support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "SaoKim_ecommerce_BE",
        Version = "v1"
    });

    // Define HTTP Bearer scheme so Swagger UI can send JWT tokens
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Bearer. Just paste the token (no need to prefix with 'Bearer').",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    });

    // Apply the Bearer security requirement to all endpoints by default
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

// In-memory cache for application-level caching
builder.Services.AddMemoryCache();

// Register HttpClient factory (used by services and controllers)
builder.Services.AddHttpClient();

// Dependency Injection registrations for application services
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
builder.Services.AddScoped<ICustomerOrderService, CustomerOrderService>();
builder.Services.AddScoped<IAddressesService, AddressesService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IBannerService, BannerService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IManagerEmployeesService, ManagerEmployeesService>();
builder.Services.AddScoped<IOrdersService, OrdersService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IProductReviewService, ProductReviewService>();
builder.Services.AddScoped<IProjectReportsService, ProjectReportsService>();
builder.Services.AddScoped<IProjectTasksService, ProjectTasksService>();
builder.Services.AddScoped<IShippingService, ShippingService>();
builder.Services.AddScoped<IStaffOrdersService, StaffOrdersService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IManagerReportsService, ManagerReportsService>();
builder.Services.AddScoped<INotificationService, NotificationService>();


// Configure EF Core DbContext (PostgreSQL via Npgsql)
builder.Services.AddDbContext<SaoKimDBContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// Read allowed CORS origins from configuration (fallback to localhost FE)
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? new[] { "http://localhost:5173" };

// Configure CORS policy for frontend application
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

// Configure JWT Bearer authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var key = builder.Configuration["Jwt:Key"];
        var issuer = builder.Configuration["Jwt:Issuer"];
        var audience = builder.Configuration["Jwt:Audience"];

        // Token validation rules
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

        // Custom JWT events
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                // Allow passing JWT token via query string for SignalR hubs
                if (!string.IsNullOrEmpty(accessToken) &&
                    path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
            OnChallenge = ctx =>
            {
                // Override default challenge response to return JSON instead of HTML
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
                // Return JSON for forbidden responses
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                ctx.Response.ContentType = "application/json; charset=utf-8";
                return ctx.Response.WriteAsync("{\"message\":\"Forbidden\"}");
            }
        };
    });

// Authorization: by default require authenticated user for all endpoints
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

var app = builder.Build();

// Example path for font used by QuestPDF (ensure the font file exists)
var fontPath = Path.Combine(builder.Environment.WebRootPath ?? "wwwroot", "fonts", "NotoSans-Regular.ttf");

// Apply pending migrations and seed initial data on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SaoKimDBContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db);
}

// Enable Swagger UI in development; use HSTS in production
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

// Simple endpoint to inspect registered routes (for debugging)
app.MapGet("/__routes", (EndpointDataSource eds) =>
    Results.Json(eds.Endpoints.Select(e => e.DisplayName)));

// Serve static files from wwwroot (and related folders)
app.UseStaticFiles();

// Redirect HTTP to HTTPS
app.UseHttpsRedirection();

app.UseRouting();

// Apply CORS policy for frontend client(s)
app.UseCors("AllowFE");

// Authentication and authorization middlewares
app.UseAuthentication();
app.UseAuthorization();

// Map API controllers
app.MapControllers();

// Map SignalR hubs for warehouse-related real-time updates
app.MapHub<DispatchHub>("/hubs/dispatch");
app.MapHub<ReceivingHub>("/hubs/receiving");
app.MapHub<InventoryHub>("/hubs/inventory");
app.MapHub<NotificationsHub>("/hubs/notifications");
// Start the application
app.Run();
