using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Services;
using System.Text.Json.Serialization; // <-- thêm

var builder = WebApplication.CreateBuilder(args);

// 1) Services
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        // camelCase, ISO8601
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;

        // Enum serialize/deserialize b?ng CH?: "New" | "InProgress" | "Done"
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());

        // (tu? ch?n) n?i l?ng phân bi?t hoa/th??ng khi parse tên thu?c tính
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddMemoryCache();

builder.Services.AddScoped<IPasswordResetService, PasswordResetService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IProjectService, ProjectService>();

builder.Services.AddDbContext<SaoKimDBContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// 2) CORS – ??c t? appsettings.json
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
        // .WithExposedHeaders("X-Total-Count"); // n?u c?n expose header
    });
});

var app = builder.Build();

// 3) DB migrate + seed
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SaoKimDBContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAsync(db);
}

// 4) Middleware pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

app.UseHttpsRedirection();

// ??t CORS tr??c MapControllers (và tr??c auth n?u có)
app.UseCors("AllowFE");

// N?u có auth sau này:
// app.UseAuthentication();
// app.UseAuthorization();

app.MapControllers();

app.Run();
