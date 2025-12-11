using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models.Requests;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IOrdersService
    {
        Task<OrderCreateResultDto> CreateOrderAsync(CreateOrderRequest request, User user);
        Task<(int total, List<MyOrderListItemDto> items)> GetMyOrdersAsync(int userId, int page, int pageSize);
    }
}
