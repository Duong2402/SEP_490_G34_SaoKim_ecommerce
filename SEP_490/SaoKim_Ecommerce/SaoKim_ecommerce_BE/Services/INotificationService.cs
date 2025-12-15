using SaoKim_ecommerce_BE.Entities;

public interface INotificationService
{
    Task CreatePromotionNotificationAsync(int promotionId); 
    Task CreateNewOrderNotificationToWarehouseAsync(int orderId, int dispatchSlipId);

}
