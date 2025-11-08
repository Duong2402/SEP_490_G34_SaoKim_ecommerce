using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SaoKim_ecommerce_BE.Migrations
{
    /// <inheritdoc />
    public partial class DispatchSlipNew : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "dispatch_list",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReferenceNo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    dispatch_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dispatch_list", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "dispatch_item",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    dispatch_id = table.Column<int>(type: "integer", nullable: false),
                    ProductName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Uom = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "pcs"),
                    Quantity = table.Column<int>(type: "integer", precision: 18, scale: 3, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Total = table.Column<decimal>(type: "numeric(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dispatch_item", x => x.Id);
                    table.ForeignKey(
                        name: "FK_dispatch_item_dispatch_list_dispatch_id",
                        column: x => x.dispatch_id,
                        principalTable: "dispatch_list",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dispatch_project_list",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    ProjectName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    project_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dispatch_project_list", x => x.Id);
                    table.ForeignKey(
                        name: "FK_dispatch_project_list_dispatch_list_Id",
                        column: x => x.Id,
                        principalTable: "dispatch_list",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dispatch_retail_list",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    CustomerName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    customer_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dispatch_retail_list", x => x.Id);
                    table.ForeignKey(
                        name: "FK_dispatch_retail_list_dispatch_list_Id",
                        column: x => x.Id,
                        principalTable: "dispatch_list",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_dispatch_item_dispatch_id",
                table: "dispatch_item",
                column: "dispatch_id");

            migrationBuilder.CreateIndex(
                name: "IX_dispatch_list_ReferenceNo",
                table: "dispatch_list",
                column: "ReferenceNo",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "dispatch_item");

            migrationBuilder.DropTable(
                name: "dispatch_project_list");

            migrationBuilder.DropTable(
                name: "dispatch_retail_list");

            migrationBuilder.DropTable(
                name: "dispatch_list");
        }
    }
}
