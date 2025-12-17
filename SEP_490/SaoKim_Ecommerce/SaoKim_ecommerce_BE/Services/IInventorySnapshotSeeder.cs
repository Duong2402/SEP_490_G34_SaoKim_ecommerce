namespace SaoKim_ecommerce_BE.Services
{
    public interface IInventorySnapshotSeeder
    {
        Task<long> SeedBaselineAsync(DateTime? baselineUtc = null, string actor = "system");
    }
}
