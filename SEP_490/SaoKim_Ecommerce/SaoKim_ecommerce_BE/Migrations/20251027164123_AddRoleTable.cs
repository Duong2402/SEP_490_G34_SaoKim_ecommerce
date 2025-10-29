using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SaoKim_ecommerce_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddRoleTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Supplier",
                table: "products",
                newName: "supplier");

            migrationBuilder.RenameColumn(
                name: "Quantity",
                table: "products",
                newName: "quantity");

            migrationBuilder.RenameColumn(
                name: "Note",
                table: "products",
                newName: "note");

            migrationBuilder.RenameColumn(
                name: "Date",
                table: "products",
                newName: "date");

            migrationBuilder.RenameColumn(
                name: "Number",
                table: "products",
                newName: "price");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "products",
                newName: "product_name");

            migrationBuilder.RenameColumn(
                name: "Code",
                table: "products",
                newName: "product_code");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "products",
                newName: "product_id");

            migrationBuilder.RenameIndex(
                name: "IX_products_Code",
                table: "products",
                newName: "IX_products_product_code");

            migrationBuilder.AddColumn<string>(
                name: "category",
                table: "products",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "create_at",
                table: "products",
                type: "timestamp with time zone",
                nullable: true,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<string>(
                name: "create_by",
                table: "products",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "products",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "image",
                table: "products",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "products",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "unit",
                table: "products",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "update_at",
                table: "products",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "update_by",
                table: "products",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "role",
                columns: table => new
                {
                    role_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    role_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role", x => x.role_id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "role");

            migrationBuilder.DropColumn(
                name: "category",
                table: "products");

            migrationBuilder.DropColumn(
                name: "create_at",
                table: "products");

            migrationBuilder.DropColumn(
                name: "create_by",
                table: "products");

            migrationBuilder.DropColumn(
                name: "description",
                table: "products");

            migrationBuilder.DropColumn(
                name: "image",
                table: "products");

            migrationBuilder.DropColumn(
                name: "status",
                table: "products");

            migrationBuilder.DropColumn(
                name: "unit",
                table: "products");

            migrationBuilder.DropColumn(
                name: "update_at",
                table: "products");

            migrationBuilder.DropColumn(
                name: "update_by",
                table: "products");

            migrationBuilder.RenameColumn(
                name: "supplier",
                table: "products",
                newName: "Supplier");

            migrationBuilder.RenameColumn(
                name: "quantity",
                table: "products",
                newName: "Quantity");

            migrationBuilder.RenameColumn(
                name: "note",
                table: "products",
                newName: "Note");

            migrationBuilder.RenameColumn(
                name: "date",
                table: "products",
                newName: "Date");

            migrationBuilder.RenameColumn(
                name: "product_name",
                table: "products",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "product_code",
                table: "products",
                newName: "Code");

            migrationBuilder.RenameColumn(
                name: "price",
                table: "products",
                newName: "Number");

            migrationBuilder.RenameColumn(
                name: "product_id",
                table: "products",
                newName: "Id");

            migrationBuilder.RenameIndex(
                name: "IX_products_product_code",
                table: "products",
                newName: "IX_products_Code");
        }
    }
}
