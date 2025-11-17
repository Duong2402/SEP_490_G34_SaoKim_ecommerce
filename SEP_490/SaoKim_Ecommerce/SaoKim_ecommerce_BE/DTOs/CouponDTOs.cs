using System;
using System.Collections.Generic;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class CouponListItemDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string DiscountType { get; set; } = default!;
        public decimal DiscountValue { get; set; }
        public string Status { get; set; } = default!;
        public DateTimeOffset? StartDate { get; set; }
        public DateTimeOffset? EndDate { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public int TotalRedeemed { get; set; }
    }

    public class CouponDetailDto : CouponListItemDto
    {
        public string? Description { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public int? MaxUsage { get; set; }
        public int? PerUserLimit { get; set; }
    }

    public class CouponCreateUpdateDto
    {
        public string Code { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public string DiscountType { get; set; } = "Percentage";
        public decimal DiscountValue { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public int? MaxUsage { get; set; }
        public int? PerUserLimit { get; set; }
        public DateTimeOffset? StartDate { get; set; }
        public DateTimeOffset? EndDate { get; set; }
        public string Status { get; set; } = "Draft";
    }

    public class CouponListResponse
    {
        public IEnumerable<CouponListItemDto> Items { get; set; } = Array.Empty<CouponListItemDto>();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}
