using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SaoKim_ecommerce_BE.Data;
using SaoKim_ecommerce_BE.DTOs;
using SaoKim_ecommerce_BE.Entities;
using SaoKim_ecommerce_BE.Models;
using SaoKim_ecommerce_BE.Services.Realtime;

namespace SaoKim_ecommerce_BE.Services
{
    public class StaffOrdersService : IStaffOrdersService
    {
        private readonly SaoKimDBContext _db;
        private readonly ILogger<StaffOrdersService> _logger;
        private readonly IDispatchService _dispatchService;
        private readonly IRealtimePublisher _rt;

        public StaffOrdersService(
            SaoKimDBContext db,
            ILogger<StaffOrdersService> logger,
            IDispatchService dispatchService,
            IRealtimePublisher rt)
        {
            _db = db;
            _logger = logger;
            _dispatchService = dispatchService;
            _rt = rt;
        }


        public async Task<PagedResult<StaffOrderListItemDto>> GetListAsync(
            string? q,
            string? status,
            DateTime? createdFrom,
            DateTime? createdTo,
            string sortBy,
            string sortDir,
            int page,
            int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 200) pageSize = 10;

            var baseQuery = _db.Orders
                .AsNoTracking()
                .Include(o => o.Customer)
                .Include(o => o.Invoice)
                .Where(o => o.Customer != null && o.Customer.DeletedAt == null);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                baseQuery = baseQuery.Where(o =>
                    o.OrderId.ToString().Contains(term) ||
                    (o.Customer!.Name != null && o.Customer.Name.ToLower().Contains(term)) ||
                    (o.Customer.Email != null && o.Customer.Email.ToLower().Contains(term)) ||
                    (o.Customer.PhoneNumber != null && o.Customer.PhoneNumber.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var st = status.Trim();
                baseQuery = baseQuery.Where(o =>
                    o.Status != null &&
                    EF.Functions.ILike(o.Status, st));
            }

            if (createdFrom.HasValue)
                baseQuery = baseQuery.Where(o => o.CreatedAt >= createdFrom.Value);

            if (createdTo.HasValue)
                baseQuery = baseQuery.Where(o => o.CreatedAt < createdTo.Value);

            var desc = sortDir.Equals("desc", StringComparison.OrdinalIgnoreCase);
            sortBy = (sortBy ?? "").ToLowerInvariant();

            baseQuery = sortBy switch
            {
                "total" => desc
                    ? baseQuery.OrderByDescending(o => o.Total)
                    : baseQuery.OrderBy(o => o.Total),

                "status" => desc
                    ? baseQuery.OrderByDescending(o => o.Status)
                    : baseQuery.OrderBy(o => o.Status),

                "customer" => desc
                    ? baseQuery.OrderByDescending(o => o.Customer!.Name)
                    : baseQuery.OrderBy(o => o.Customer!.Name),

                "created" or _ => desc
                    ? baseQuery.OrderByDescending(o => o.CreatedAt)
                    : baseQuery.OrderBy(o => o.CreatedAt),
            };

            var total = await baseQuery.CountAsync();

            var orders = await baseQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new
                {
                    o.OrderId,
                    ReferenceNo = $"ORD-{o.OrderId}",
                    CustomerName = o.Customer!.Name,
                    CustomerEmail = o.Customer.Email,
                    CustomerPhone = o.Customer.PhoneNumber,
                    o.Total,
                    o.Status,
                    o.CreatedAt,
                    o.PaymentMethod,
                    HasInvoice = o.Invoice != null,
                    InvoiceId = o.Invoice != null ? (int?)o.Invoice.Id : null
                })
                .ToListAsync();

            var referenceNos = orders.Select(o => o.ReferenceNo).ToList();

            var confirmedRefs = referenceNos.Count == 0
                ? new HashSet<string>()
                : new HashSet<string>(
                    await _db.Dispatches
                        .AsNoTracking()
                        .Where(d => referenceNos.Contains(d.ReferenceNo) && d.ConfirmedAt != null)
                        .Select(d => d.ReferenceNo)
                        .ToListAsync()
                  );

            var items = orders.Select(o => new StaffOrderListItemDto
            {
                Id = o.OrderId,
                Code = o.ReferenceNo,
                CustomerName = o.CustomerName,
                CustomerEmail = o.CustomerEmail,
                CustomerPhone = o.CustomerPhone,
                Total = o.Total,
                Status = o.Status,
                CreatedAt = o.CreatedAt,
                PaymentMethod = o.PaymentMethod,
                HasInvoice = o.HasInvoice,
                InvoiceId = o.InvoiceId,
                DispatchConfirmed = confirmedRefs.Contains(o.ReferenceNo)
            }).ToList();

            return new PagedResult<StaffOrderListItemDto>
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = total,
                Items = items
            };
        }

        public async Task<StaffOrderDetailDto?> GetByIdAsync(int id)
        {
            var order = await _db.Orders
                .AsNoTracking()
                .Include(o => o.Customer)
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null) return null;

            var dto = new StaffOrderDetailDto
            {
                Id = order.OrderId,
                Code = $"ORD-{order.OrderId}",
                Total = order.Total,
                Status = order.Status,
                CreatedAt = order.CreatedAt,

                Subtotal = order.Subtotal,
                DiscountAmount = order.DiscountAmount,
                ShippingFee = order.ShippingFee,
                VatAmount = order.VatAmount,

                CustomerId = order.UserId,
                CustomerName = order.Customer?.Name,
                CustomerEmail = order.Customer?.Email,
                CustomerPhone = order.Customer?.PhoneNumber,

                CustomerMessage = order.CustomerMessage,

                Payment = new StaffOrderPaymentDto
                {
                    Method = order.PaymentMethod,
                    Status = order.PaymentStatus,
                    TransactionCode = order.PaymentTransactionCode,
                    PaidAt = order.PaidAt
                },

                ShippingRecipientName = order.ShippingRecipientName,
                ShippingPhoneNumber = order.ShippingPhoneNumber,
                ShippingLine1 = order.ShippingLine1,
                ShippingWard = order.ShippingWard,
                ShippingDistrict = order.ShippingDistrict,
                ShippingProvince = order.ShippingProvince
            };

            if (order.Invoice != null)
            {
                dto.Invoice = new StaffOrderInvoiceSummaryDto
                {
                    Id = order.Invoice.Id,
                    Code = order.Invoice.Code,
                    Total = order.Invoice.Total,
                    Status = order.Invoice.Status.ToString(),
                    CreatedAt = order.Invoice.CreatedAt
                };
            }

            dto.Items = order.Items.Select(i => new StaffOrderItemDto
            {
                OrderItemId = i.OrderItemId,
                ProductId = i.ProductId,
                ProductName = i.Product?.ProductName ?? string.Empty,
                ProductCode = i.Product?.ProductCode,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                LineTotal = i.UnitPrice * i.Quantity
            }).ToList();

            return dto;
        }

        public async Task UpdateStatusAsync(int id, string newStatusRaw)
        {
            var rawStatus = (newStatusRaw ?? "").Trim();

            if (string.IsNullOrWhiteSpace(rawStatus))
                throw new ArgumentException("Status is required.");

            string NormalizeStatus(string s)
            {
                if (string.Equals(s, "Hoàn tất", StringComparison.OrdinalIgnoreCase))
                    return "Completed";
                if (string.Equals(s, "Chờ xử lý", StringComparison.OrdinalIgnoreCase))
                    return "Pending";
                if (string.Equals(s, "Đang giao", StringComparison.OrdinalIgnoreCase))
                    return "Shipping";
                if (string.Equals(s, "Đã hủy", StringComparison.OrdinalIgnoreCase))
                    return "Cancelled";
                if (string.Equals(s, "Đã thanh toán", StringComparison.OrdinalIgnoreCase))
                    return "Paid";

                return s;
            }

            var newStatus = NormalizeStatus(rawStatus);

            var allowedStatuses = new[]
            {
                "Pending",
                "Shipping",
                "Paid",
                "Completed",
                "Cancelled"
            };

            if (!allowedStatuses.Contains(newStatus, StringComparer.OrdinalIgnoreCase))
            {
                throw new ArgumentException($"Invalid status: {rawStatus}");
            }

            bool IsCompleted(string status)
                => string.Equals(status, "Completed", StringComparison.OrdinalIgnoreCase);

            bool IsPaid(string status)
                => string.Equals(status, "Paid", StringComparison.OrdinalIgnoreCase);

            var order = await _db.Orders
                .Include(o => o.Customer)
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null)
                throw new KeyNotFoundException("Order not found.");

            var paymentMethod = (order.PaymentMethod ?? "").Trim().ToUpperInvariant();
            var isCod = paymentMethod == "COD";
            var isQr = paymentMethod == "QR";

            if (isQr && IsPaid(newStatus))
            {
                throw new InvalidOperationException("Đơn thanh toán QR không có bước 'Đã thanh toán' riêng.");
            }

            if (isCod && IsCompleted(newStatus) && !IsPaid(order.Status))
            {
                throw new InvalidOperationException("Đơn COD phải chuyển sang 'Đã thanh toán' trước khi hoàn tất.");
            }

            var isCancelling = string.Equals(newStatus, "Cancelled", StringComparison.OrdinalIgnoreCase);

            if (!isCancelling)
            {
                var referenceNo = $"ORD-{order.OrderId}";

                var dispatch = await _db.Dispatches
                    .AsNoTracking()
                    .FirstOrDefaultAsync(d => d.ReferenceNo == referenceNo);

                if (dispatch == null || dispatch.ConfirmedAt == null)
                {
                    throw new InvalidOperationException(
                        "Kho chưa xác nhận phiếu xuất, không thể cập nhật trạng thái đơn hàng.");
                }
            }

            if (IsCompleted(order.Status) && !IsCompleted(newStatus))
            {
                throw new InvalidOperationException("Completed order cannot change status.");
            }

            order.Status = newStatus;

            var shouldCreateInvoice = IsCompleted(newStatus) && order.Invoice == null;

            if (shouldCreateInvoice)
            {
                var items = order.Items.ToList();
                var subtotal = items.Sum(it => it.UnitPrice * it.Quantity);

                var discount = order.DiscountAmount;

                var taxBase = subtotal - discount;
                if (taxBase < 0) taxBase = 0;

                var tax = Math.Round(taxBase * 0.10m, 0, MidpointRounding.AwayFromZero);

                var shippingFee = order.ShippingFee;

                var total = subtotal - discount + tax + shippingFee;

                var invoice = new Invoice
                {
                    Code = $"INV-{DateTime.UtcNow:yyyyMMddHHmmss}-{order.OrderId}",
                    CreatedAt = DateTime.UtcNow,

                    OrderId = order.OrderId,
                    CustomerId = order.UserId,
                    CustomerName = order.Customer?.Name,
                    Email = order.Customer?.Email,
                    Phone = order.Customer?.PhoneNumber,

                    Subtotal = subtotal,
                    Discount = discount,
                    Tax = tax,
                    ShippingFee = shippingFee,
                    Total = total,

                    Status = InvoiceStatus.Paid,
                    Items = items.Select(oi => new InvoiceItem
                    {
                        ProductId = oi.ProductId,
                        ProductName = oi.Product?.ProductName ?? "",
                        Uom = "pcs",
                        Quantity = oi.Quantity,
                        UnitPrice = oi.UnitPrice,
                        LineTotal = oi.UnitPrice * oi.Quantity,
                        OrderCode = order.OrderId.ToString()
                    }).ToList()
                };

                _db.Set<Invoice>().Add(invoice);
            }

            await _db.SaveChangesAsync();
            await _rt.PublishAsync("order.status.updated", new
            {
                orderId = order.OrderId,
                code = $"ORD-{order.OrderId}",
                status = order.Status,
                paymentStatus = order.PaymentStatus,
                updatedAtUtc = DateTime.UtcNow
            });

            await _rt.PublishToRoleAsync("staff", "order.status.updated", new
            {
                orderId = order.OrderId,
                code = $"ORD-{order.OrderId}",
                status = order.Status,
                total = order.Total,
                createdAt = order.CreatedAt
            });

            await _rt.PublishToRoleAsync("admin", "order.status.updated", new
            {
                orderId = order.OrderId,
                code = $"ORD-{order.OrderId}",
                status = order.Status,
                total = order.Total,
                createdAt = order.CreatedAt
            });

            await _rt.PublishToUserAsync(order.UserId, "order.status.updated", new
            {
                orderId = order.OrderId,
                code = $"ORD-{order.OrderId}",
                status = order.Status,
                updatedAtUtc = DateTime.UtcNow
            });

        }

        public async Task<List<StaffOrderItemDto>> GetItemsAsync(int orderId)
        {
            try
            {
                var items = await (
                    from oi in _db.OrderItems.AsNoTracking()
                    join p in _db.Products.AsNoTracking()
                        on oi.ProductId equals p.ProductID
                    where oi.OrderId == orderId
                    select new StaffOrderItemDto
                    {
                        OrderItemId = oi.OrderItemId,
                        ProductId = oi.ProductId,
                        ProductName = p.ProductName,
                        ProductCode = p.ProductCode,
                        Quantity = oi.Quantity,
                        UnitPrice = oi.UnitPrice,
                        LineTotal = oi.Quantity * oi.UnitPrice
                    }
                ).ToListAsync();

                return items;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching items for order {OrderId}", orderId);
                throw;
            }
        }

        public async Task DeleteAsync(int id)
        {
            var order = await _db.Orders
                .Include(o => o.Items)
                .Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null)
                throw new KeyNotFoundException("Order not found.");

            if (!string.Equals(order.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Chỉ được xóa đơn hàng đã ở trạng thái Đã hủy.");
            }

            if (order.Invoice != null)
            {
                throw new InvalidOperationException("Không thể xóa đơn đã có hóa đơn.");
            }

            var salesOrderNo = $"ORD-{id}";

            var dispatchIds = await _db.Dispatches
                .Where(d => d.ReferenceNo == salesOrderNo)
                .Select(d => d.Id)
                .ToListAsync();

            foreach (var dispatchId in dispatchIds)
            {
                await _dispatchService.DeleteDispatchSlipAsync(dispatchId);
            }

            _db.OrderItems.RemoveRange(order.Items);
            _db.Orders.Remove(order);

            await _db.SaveChangesAsync();
            await _rt.PublishToRoleAsync("staff", "order.deleted", new
            {
                orderId = id,
                code = $"ORD-{id}",
                deletedAtUtc = DateTime.UtcNow
            });

            await _rt.PublishToRoleAsync("admin", "order.deleted", new
            {
                orderId = id,
                code = $"ORD-{id}",
                deletedAtUtc = DateTime.UtcNow
            });
        }
    }
}
