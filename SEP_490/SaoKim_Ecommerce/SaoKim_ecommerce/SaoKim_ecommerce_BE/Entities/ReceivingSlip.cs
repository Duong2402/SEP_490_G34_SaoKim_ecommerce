using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SaoKim_ecommerce_BE.Entities
{
    public enum ReceivingSlipStatus
    {
        Draft = 0,
        Confirmed = 1
    }

    public class ReceivingSlip
    {
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string ReferenceNo { get; set; } = "";   

        [Required, MaxLength(200)]
        public string Supplier { get; set; } = "";

        [Required]
        public DateTime ReceiptDate { get; set; } = DateTime.UtcNow;

        [MaxLength(500)]
        public string? Note { get; set; }

        public ReceivingSlipStatus Status { get; set; } = ReceivingSlipStatus.Draft;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ConfirmedAt { get; set; }

        public ICollection<ReceivingSlipItem> Items { get; set; } = new List<ReceivingSlipItem>();
    }
}
