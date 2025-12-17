namespace SaoKim_ecommerce_BE.Services
{
    public interface IInventorySnapshotService
    {
        Task AddIfNotExistsAsync(int productId, DateTime snapshotAtUtc, decimal onHand, string refType, long refId);
    }
}
