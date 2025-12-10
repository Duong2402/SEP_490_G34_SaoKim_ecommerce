using System.Threading.Tasks;

namespace SaoKim_ecommerce_BE.Services
{
    public interface IEmailService
    {
        Task SendAsync(string to, string subject, string body);
    }
}
