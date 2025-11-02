using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SaoKim_ecommerce_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectTasks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "project_tasks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Assignee = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DurationDays = table.Column<int>(type: "integer", nullable: false),
                    ProjectId = table.Column<int>(type: "integer", nullable: false),
                    DependsOnTaskId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_tasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_project_tasks_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_project_tasks_project_tasks_DependsOnTaskId",
                        column: x => x.DependsOnTaskId,
                        principalTable: "project_tasks",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "project_task_days",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TaskItemId = table.Column<int>(type: "integer", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_task_days", x => x.Id);
                    table.ForeignKey(
                        name: "FK_project_task_days_project_tasks_TaskItemId",
                        column: x => x.TaskItemId,
                        principalTable: "project_tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_project_task_days_TaskItemId_Date",
                table: "project_task_days",
                columns: new[] { "TaskItemId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_project_tasks_DependsOnTaskId",
                table: "project_tasks",
                column: "DependsOnTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_project_tasks_ProjectId",
                table: "project_tasks",
                column: "ProjectId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "project_task_days");

            migrationBuilder.DropTable(
                name: "project_tasks");
        }
    }
}
