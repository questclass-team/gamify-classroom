using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestClass.Core.Common.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserNickname : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "nickname",
                schema: "core",
                table: "users",
                type: "character varying(24)",
                maxLength: 24,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "nickname_key",
                schema: "core",
                table: "users",
                type: "text",
                nullable: true,
                computedColumnSql: "lower(nickname COLLATE \"und-x-icu\")",
                stored: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_nickname_key",
                schema: "core",
                table: "users",
                column: "nickname_key",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_users_nickname_key",
                schema: "core",
                table: "users");

            migrationBuilder.DropColumn(
                name: "nickname_key",
                schema: "core",
                table: "users");

            migrationBuilder.DropColumn(
                name: "nickname",
                schema: "core",
                table: "users");
        }
    }
}
