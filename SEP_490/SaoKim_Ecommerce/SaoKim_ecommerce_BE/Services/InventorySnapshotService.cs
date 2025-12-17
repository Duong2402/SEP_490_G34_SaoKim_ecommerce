using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services
{
    public class InventorySnapshotService : IInventorySnapshotService
    {
        private readonly SaoKimDBContext _db;

        public InventorySnapshotService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task AddIfNotExistsAsync(
            int productId,
            DateTime snapshotAtUtc,
            decimal onHand,
            string refType,
            long refId)
        {
            var existed = await _db.InventoryStockSnapshots.AsNoTracking()
                .AnyAsync(x => x.RefType == refType && x.RefId == refId && x.ProductId == productId);

            if (existed) return;

            _db.InventoryStockSnapshots.Add(new InventoryStockSnapshot
            {
                ProductId = productId,
                SnapshotAt = snapshotAtUtc,
                OnHand = onHand,
                RefType = refType,
                RefId = refId,
                CreatedAt = DateTime.UtcNow
            });
        }
    }
}
