using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SaoKim_ecommerce_BE.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSchema_20251217 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EndDate",
                table: "Banners",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartDate",
                table: "Banners",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EndDate",
                table: "Banners");

            migrationBuilder.DropColumn(
                name: "StartDate",
                table: "Banners");
        }
    }
}
