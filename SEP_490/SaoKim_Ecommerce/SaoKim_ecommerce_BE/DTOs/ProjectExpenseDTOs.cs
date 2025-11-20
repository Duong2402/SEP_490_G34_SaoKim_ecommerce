using System;
using System.ComponentModel.DataAnnotations;

namespace SaoKim_ecommerce_BE.DTOs
{
    public class ProjectExpenseCreateDTO
    {
        [Required] public DateTime Date { get; set; }
        [MaxLength(100)] public string? Category { get; set; }
        [MaxLength(300)] public string? Vendor { get; set; }
        [MaxLength(500)] public string? Description { get; set; }
        [Range(0, 1_000_000_000)] public decimal Amount { get; set; }
        [MaxLength(300)] public string? ReceiptUrl { get; set; }
    }

    public class ProjectExpenseUpdateDTO
    {
        [Required] public DateTime Date { get; set; }
        [MaxLength(100)] public string? Category { get; set; }
        [MaxLength(300)] public string? Vendor { get; set; }
        [MaxLength(500)] public string? Description { get; set; }
        [Range(0, 1_000_000_000)] public decimal Amount { get; set; }
        [MaxLength(300)] public string? ReceiptUrl { get; set; }
    }

    public class ProjectExpenseListItemDTO
    {
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public string? Category { get; set; }
        public string? Vendor { get; set; }
        public string? Description { get; set; }
        public decimal Amount { get; set; }
        public string? ReceiptUrl { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ProjectExpenseQuery
    {
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public string? Category { get; set; }
        public string? Vendor { get; set; }
        public string? Keyword { get; set; } 
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? Sort { get; set; } = "-Date"; 
    }

    public class ProjectExpenseListResult
    {
        public PagedResult<ProjectExpenseListItemDTO> Page { get; set; } = default!;
        public decimal TotalAmount { get; set; }
    }
}
