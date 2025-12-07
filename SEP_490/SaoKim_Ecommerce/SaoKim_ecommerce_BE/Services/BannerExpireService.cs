using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SaoKim_ecommerce_BE.Data;

namespace SaoKim_ecommerce_BE.Services
{
    public class BannerExpireService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<BannerExpireService> _logger;

        public BannerExpireService(
            IServiceScopeFactory scopeFactory,
            ILogger<BannerExpireService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("BannerExpireService started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunJobAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while running BannerExpireService job");
                }

                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }

            _logger.LogInformation("BannerExpireService stopping.");
        }

        private async Task RunJobAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SaoKimDBContext>();

            var today = DateTime.UtcNow.Date;

            var expiredBanners = await db.Banners
                .Where(b => b.IsActive && b.EndDate != null && b.EndDate < today)
                .ToListAsync(cancellationToken);
            if (expiredBanners.Count == 0)
            {
                _logger.LogInformation("No expired banners to deactivate at {Time}", DateTime.UtcNow);
                return;
            }

            foreach (var banner in expiredBanners)
            {
                banner.IsActive = false;
            }

            await db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Deactivated {Count} expired banners at {Time}",
                expiredBanners.Count,
                DateTime.UtcNow);
        }
    }
}
