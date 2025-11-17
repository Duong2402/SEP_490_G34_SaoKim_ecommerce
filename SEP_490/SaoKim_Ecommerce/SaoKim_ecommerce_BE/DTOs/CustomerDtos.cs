using System;
using System.Collections.Generic;

namespace SaoKim_ecommerce_BE.Dtos.Customers
{
    public record CustomerListItemDto(
        int Id,
        string Name,
        string Email,
        string? PhoneNumber,
        DateTime CreateAt,
        bool IsBanned,
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

    public record CustomerDetailDto(
        int Id,
        string Name,
        string Email,
        string? PhoneNumber,
        string? Address,
        DateTime CreateAt,
        bool IsBanned,
        int OrdersCount,
        decimal TotalSpend,
        DateTime? LastOrderAt,
        IEnumerable<CustomerNoteDto> Notes
    );
    //add note cho manager
    public class CustomerNoteCreateRequest
    {
        public string Content { get; set; } = string.Empty;
    }
}
