using System;
using System.Collections.Generic;

namespace SaoKim_ecommerce_BE.Dtos.Customers
{
    // Dùng cho màn danh sách khách hàng
    public record CustomerListItemDto(
        int Id,
        string Name,
        string Email,
        string? PhoneNumber,
        DateTime CreateAt,
        int OrdersCount,
        decimal TotalSpend,
        DateTime? LastOrderAt
    );

    public record CustomerNoteDto(
        int Id,
        int StaffId,
        string StaffName,
        string Content,
        DateTime CreatedAt
    );

    // Dùng cho màn chi tiết khách hàng
    public record CustomerDetailDto(
        int Id,
        string Name,
        string Email,
        string? PhoneNumber,
        string? Address,
        DateTime CreateAt,
        int OrdersCount,
        decimal TotalSpend,
        DateTime? LastOrderAt,
        IEnumerable<CustomerNoteDto> Notes
    );

    public class CustomerNoteCreateRequest
    {
        public string Content { get; set; } = string.Empty;
    }
}
