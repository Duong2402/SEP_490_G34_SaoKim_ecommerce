using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;

namespace SaoKim_ecommerce_BE.Services
{
    public class CustomerOrderService : ICustomerOrderService
    {
        private readonly SaoKimDBContext _db;

        public CustomerOrderService(SaoKimDBContext db)
        {
            _db = db;
        }

        public async Task<CustomerOrderDetailDto?> GetOrderDetailAsync(int orderId, int currentUserId)
        {
            var order = await _db.Orders
                .AsNoTracking()
                .Include(o => o.Items)
                    .ThenInclude(i => i.Product)
                .Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.OrderId == orderId && o.UserId == currentUserId);

            if (order == null)
                return null;

            var productIds = order.Items
                .Select(i => i.ProductId)
                .Distinct()
                .ToList();

            var detailDict = await _db.ProductDetails
                .Where(d => productIds.Contains(d.ProductID))
                .GroupBy(d => d.ProductID)
                .Select(g => g.OrderByDescending(d => d.Id).First())
                .ToDictionaryAsync(d => d.ProductID, d => d);

            var items = order.Items
                .Select(i =>
                {
                    detailDict.TryGetValue(i.ProductId, out var detail);

                    return new CustomerOrderItemDto
                    {
                        OrderItemId = i.OrderItemId,
                        ProductId = i.ProductId,
                        ProductName = i.Product?.ProductName ?? string.Empty,
                        ProductCode = i.Product?.ProductCode ?? string.Empty,
                        ImageUrl = detail?.Image,
                        Unit = detail?.Unit,
                        Quantity = i.Quantity,
                        UnitPrice = i.UnitPrice,
                        LineTotal = i.UnitPrice * i.Quantity
                    };
                })
                .ToList();

            var shipping = new CustomerOrderAddressDto
            {
                RecipientName = order.ShippingRecipientName,
                PhoneNumber = order.ShippingPhoneNumber,
                Line1 = order.ShippingLine1,
                Ward = order.ShippingWard,
                District = order.ShippingDistrict,
                Province = order.ShippingProvince
            };

            static bool LooksPaid(string value)
            {
                var v = (value ?? string.Empty).Trim().ToLowerInvariant();
                return v.Contains("paid") ||
                       v.Contains("complete") ||
                       v.Contains("completed") ||
                       v.Contains("hoàn") ||
                       v.Contains("hoan") ||
                       v.Contains("thanh toán") ||
                       v.Contains("da thanh toan");
            }

            var normalizedStatus = (order.Status ?? string.Empty).Trim();
            var paymentStatus = order.PaymentStatus;
            var hasInvoicePaid = order.Invoice?.Status == InvoiceStatus.Paid;
            var isPaidStatus = LooksPaid(normalizedStatus);
            var isPaymentFieldPaid = LooksPaid(paymentStatus);

            if (hasInvoicePaid || isPaidStatus || isPaymentFieldPaid)
            {
                paymentStatus = "PAID";
            }
            else if (string.IsNullOrWhiteSpace(paymentStatus))
            {
                paymentStatus = "PENDING";
            }
            else
            {
                paymentStatus = paymentStatus.Trim();
            }

            var payment = new CustomerOrderPaymentDto
            {
                Method = order.PaymentMethod,
                Status = paymentStatus,
                PaidAt = order.PaidAt,
                TransactionCode = order.PaymentTransactionCode
            };

            CustomerOrderInvoiceDto? invoiceDto = null;
            if (order.Invoice != null)
            {
                invoiceDto = new CustomerOrderInvoiceDto
                {
                    InvoiceId = order.Invoice.Id,
                    Code = order.Invoice.Code,
                    Subtotal = order.Invoice.Subtotal,
                    Discount = order.Invoice.Discount,
                    Tax = order.Invoice.Tax,
                    Total = order.Invoice.Total
                };
            }

            var dto = new CustomerOrderDetailDto
            {
                OrderId = order.OrderId,
                CreatedAt = order.CreatedAt,
                Status = order.Status,
                Total = order.Total,
                ShippingAddress = shipping,
                Payment = payment,
                Items = items,
                Invoice = invoiceDto
            };

            return dto;
        }
    }
}
