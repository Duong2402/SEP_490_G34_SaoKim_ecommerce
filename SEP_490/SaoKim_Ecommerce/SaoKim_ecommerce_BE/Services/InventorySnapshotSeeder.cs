using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;
using Microsoft.EntityFrameworkCore;

namespace SaoKim_ecommerce_BE.Services
{
    public class InventorySnapshotSeeder : IInventorySnapshotSeeder
    {
        private readonly SaoKimDBContext _db;

        public InventorySnapshotSeeder(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<long> SeedBaselineAsync(DateTime? baselineUtc = null, string actor = "system")
        {
            var baseAtUtc = baselineUtc ?? new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            if (baseAtUtc.Kind != DateTimeKind.Utc)
                baseAtUtc = DateTime.SpecifyKind(baseAtUtc, DateTimeKind.Utc);

            var alreadySeeded = await _db.InventoryStockSnapshots.AsNoTracking()
                .AnyAsync(x => x.RefType == "seed" && x.RefId == 0);

            if (alreadySeeded) return 0;

            var data =
                from p in _db.Products.AsNoTracking()
                join d in _db.ProductDetails.AsNoTracking()
                    on p.ProductID equals d.ProductID into dg
                from d in dg.DefaultIfEmpty()
                where d == null || d.Status == null || d.Status == "Active"
                select new
                {
                    ProductId = p.ProductID,
                    OnHand = d != null ? (decimal)d.Quantity : 0m
                };

            var list = await data.ToListAsync();
            if (list.Count == 0) return 0;

            var now = DateTime.UtcNow;

            foreach (var x in list)
            {
                _db.InventoryStockSnapshots.Add(new InventoryStockSnapshot
                {
                    ProductId = x.ProductId,
                    SnapshotAt = baseAtUtc,
                    OnHand = x.OnHand,
                    RefType = "seed",
                    RefId = 0,
                    CreatedAt = now
                });
            }

            return await _db.SaveChangesAsync();
        }
    }
}
