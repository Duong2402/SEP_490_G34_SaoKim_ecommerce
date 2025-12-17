using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Primitives;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using QuestPDF.Infrastructure;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Hubs;
using SaoKim_ecommerce_BE.Services;
using SaoKim_ecommerce_BE.Services.Realtime;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// QuestPDF license (Community is fine for typical academic projects)
QuestPDF.Settings.License = LicenseType.Community;

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
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "SaoKim API", Version = "v1" });

    var jwtSecurityScheme = new OpenApiSecurityScheme
    {
        Scheme = "Bearer",
        BearerFormat = "JWT",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Description = "Put **_ONLY_** your JWT Bearer token on textbox below!",

        Reference = new OpenApiReference
        {
            Id = JwtBearerDefaults.AuthenticationScheme,
            Type = ReferenceType.SecurityScheme
        }
    };

    c.AddSecurityDefinition(jwtSecurityScheme.Reference.Id, jwtSecurityScheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { jwtSecurityScheme, Array.Empty<string>() }
    });
});

// SignalR
builder.Services.AddSignalR();

// Enable CORS
builder.Services.AddCors();

// In-memory caching
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
builder.Services.AddScoped<IRealtimePublisher, RealtimePublisher>();
builder.Services.AddScoped<IDashboardAdminService, DashboardAdminService>();

builder.Services.AddScoped<IInventorySnapshotService, InventorySnapshotService>();


// Chatbot (Gemini)
builder.Services.AddScoped<SaoKim_ecommerce_BE.Services.Ai.IGeminiAiClient, SaoKim_ecommerce_BE.Services.Ai.GeminiAiClient>();
builder.Services.AddScoped<SaoKim_ecommerce_BE.Services.ChatbotTools.IChatbotToolService, SaoKim_ecommerce_BE.Services.ChatbotTools.ChatbotToolService>();
builder.Services.AddScoped<SaoKim_ecommerce_BE.Services.IChatbotService, SaoKim_ecommerce_BE.Services.ChatbotService>();

// Configure EF Core DbContext (PostgreSQL via Npgsql)
builder.Services.AddDbContext<SaoKimDBContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// Read allowed CORS origins from configuration (fallback to localhost FE)
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? new[] { "http://localhost:5173" };

// Build the CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFE", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .WithExposedHeaders("Content-Disposition");
    });
});

// JWT Authentication configuration
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // ok for local dev
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey!)),
        ClockSkew = TimeSpan.Zero,
        NameClaimType = ClaimTypes.Name,
        RoleClaimType = ClaimTypes.Role
    };

    // Allow JWT in query string for SignalR connections if needed
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// Authorization
builder.Services.AddAuthorization(options =>
{
    // Fallback: require authentication by default
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});
builder.Services.AddHostedService<BannerExpireService>();
var app = builder.Build();

// Enable Swagger in development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Global exception handling (basic)
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsync("{\"success\":false,\"message\":\"Internal server error\"}");
    });
});

app.UseHttpsRedirection();

// Serve static files
app.UseStaticFiles();

// Use routing
app.UseRouting();

// Use CORS
app.UseCors("AllowFE");

// Authentication and authorization middlewares
app.UseAuthentication();
app.UseAuthorization();

// Map API controllers
app.MapControllers();

// Map SignalR hubs
app.MapHub<RealtimeHub>("/hubs/realtime");

// Start the application
app.Run();
