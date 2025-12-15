using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SaoKim_ecommerce_BE.Migrations
{
    /// <inheritdoc />
    public partial class DropNotificationRefId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
    name: "ref_id",
    table: "notifications");
            migrationBuilder.DropColumn(
    name: "group",
    table: "notifications");


        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
    name: "ref_id",
    table: "notifications",
    type: "integer",
    nullable: true);
            migrationBuilder.AddColumn<string>(
    name: "group",
    table: "notifications",
    type: "character varying(50)",
    maxLength: 50,
    nullable: true);

        }
    }
}
