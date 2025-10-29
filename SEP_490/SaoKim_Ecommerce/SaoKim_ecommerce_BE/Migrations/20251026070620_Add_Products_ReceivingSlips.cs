using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SaoKim_ecommerce_BE.Migrations
{
    /// <inheritdoc />
    public partial class Add_Products_ReceivingSlips : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "receiving_slips",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReferenceNo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Supplier = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ReceiptDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ConfirmedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_receiving_slips", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "receiving_slip_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReceivingSlipId = table.Column<int>(type: "integer", nullable: false),
                    ProductId = table.Column<int>(type: "integer", nullable: true),
                    ProductName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Uom = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Total = table.Column<decimal>(type: "numeric(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_receiving_slip_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_receiving_slip_items_products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_receiving_slip_items_receiving_slips_ReceivingSlipId",
                        column: x => x.ReceivingSlipId,
                        principalTable: "receiving_slips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_receiving_slip_items_ProductId",
                table: "receiving_slip_items",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_receiving_slip_items_ReceivingSlipId",
                table: "receiving_slip_items",
                column: "ReceivingSlipId");

            migrationBuilder.CreateIndex(
                name: "IX_receiving_slips_ReferenceNo",
                table: "receiving_slips",
                column: "ReferenceNo",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "receiving_slip_items");

            migrationBuilder.DropTable(
                name: "receiving_slips");
        }
    }
}
