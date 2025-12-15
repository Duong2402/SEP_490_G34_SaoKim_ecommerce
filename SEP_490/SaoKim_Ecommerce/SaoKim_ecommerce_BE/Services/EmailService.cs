using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace SaoKim_ecommerce_BE.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _cfg;

        public EmailService(IConfiguration cfg)
        {
            _cfg = cfg;
        }

        public async Task SendAsync(string to, string subject, string body)
        {
            var smtpHost = _cfg["Smtp:Host"];
            var smtpPort = int.Parse(_cfg["Smtp:Port"] ?? "587");
            var from = _cfg["Smtp:From"];
            var user = _cfg["Smtp:User"];
            var pass = _cfg["Smtp:Pass"];

            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(user, pass),
                EnableSsl = true
            };

            var msg = new MailMessage(from, to, subject, body)
            {
                IsBodyHtml = false
            };

            await client.SendMailAsync(msg);
        }
    }
}
