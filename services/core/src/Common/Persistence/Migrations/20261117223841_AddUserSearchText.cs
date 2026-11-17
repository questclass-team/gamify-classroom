using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestClass.Core.Common.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSearchText : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "search_text",
                schema: "core",
                table: "users",
                type: "text",
                nullable: true,
                computedColumnSql: "lower(translate(login || ' ' || first_name || ' ' || last_name, 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ', 'acelnoszzACELNOSZZ'))",
                stored: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "search_text",
                schema: "core",
                table: "users");
        }
    }
}
