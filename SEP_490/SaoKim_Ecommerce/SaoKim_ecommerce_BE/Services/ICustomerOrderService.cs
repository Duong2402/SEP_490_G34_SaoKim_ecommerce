using System.Threading.Tasks;
using SaoKim_ecommerce_BE.DTOs;

namespace SaoKim_ecommerce_BE.Services
{
    public interface ICustomerOrderService
    {
        Task<CustomerOrderDetailDto?> GetOrderDetailAsync(int orderId, int currentUserId);
    }
}
