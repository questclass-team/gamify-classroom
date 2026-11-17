using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using QuestClass.Core.Common.Persistence;
using QuestClass.Core.Entities;
using QuestClass.Core.IntegrationTests.Infrastructure;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Repositories
{
    public sealed class UserRepositoryTests : IntegrationTestBase
    {
        private const string UniqueViolation = "23505";
        private const string CheckViolation = "23514";

        public UserRepositoryTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task GetByLoginAsync_ShouldFindUserInAnyLetterCase()
        {
            var user = NewUser("jkowalski", Role.Teacher);
            await AddAsync(user);

            using var scope = CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<IUserRepository>();

            var found = await repository.GetByLoginAsync("  JKowalski ");

            found.ShouldNotBeNull();
            found.Id.ShouldBe(user.Id);
            found.FirstName.ShouldBe("Jan");
            found.Role.ShouldBe(Role.Teacher);
        }

        [Fact]
        public async Task AddAsync_ShouldStoreLoginLowerCaseAndRoleAsText()
        {
            await AddAsync(NewUser("JKowalski", Role.Teacher));

            var row = await QuerySingleRowAsync("SELECT login, role FROM core.users");

            row["login"].ShouldBe("jkowalski");
            row["role"].ShouldBe("teacher");
        }

        [Fact]
        public async Task DeleteAsync_ShouldKeepRowAndMarkItDeleted()
        {
            var user = NewUser("jkowalski");
            await AddAsync(user);
            var beforeDelete = DateTimeOffset.UtcNow;

            using (var scope = CreateScope())
            {
                var repository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
                var stored = await repository.GetByIdAsync(user.Id);
                await repository.DeleteAsync(stored!);
            }

            var row = await QuerySingleRowAsync("SELECT is_deleted, deleted_at FROM core.users");

            row["is_deleted"].ShouldBe(true);
            var deletedAt = (DateTime)row["deleted_at"];
            deletedAt.ShouldBeGreaterThanOrEqualTo(beforeDelete.UtcDateTime.AddSeconds(-1));
            deletedAt.ShouldBeLessThanOrEqualTo(DateTime.UtcNow.AddSeconds(1));
        }

        [Fact]
        public async Task DeletedUser_ShouldBeHiddenFromQueries()
        {
            var user = NewUser("jkowalski");
            await AddAsync(user);
            await DeleteAsync(user.Id);

            using var scope = CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<IUserRepository>();

            (await repository.GetByIdAsync(user.Id)).ShouldBeNull();
            (await repository.GetByLoginAsync("jkowalski")).ShouldBeNull();
        }

        [Fact]
        public async Task DeletedUser_ShouldBeVisibleWhenSoftDeleteFilterIsIgnored()
        {
            var user = NewUser("jkowalski");
            await AddAsync(user);
            await DeleteAsync(user.Id);

            using var scope = CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();

            var found = await dbContext.Users
                .IgnoreQueryFilters([QueryFilters.SoftDelete])
                .SingleOrDefaultAsync(stored => stored.Id == user.Id);

            found.ShouldNotBeNull();
            found.IsDeleted.ShouldBeTrue();
            found.DeletedAt.ShouldNotBeNull();
        }

        [Fact]
        public async Task AddAsync_WhenLoginExistsInOtherLetterCase_ShouldViolateUniqueIndex()
        {
            await AddAsync(NewUser("jkowalski"));

            var exception = await Should.ThrowAsync<DbUpdateException>(
                () => AddAsync(NewUser("JKOWALSKI")));

            exception.InnerException.ShouldBeOfType<PostgresException>()
                .SqlState.ShouldBe(UniqueViolation);
        }

        [Fact]
        public async Task AddAsync_WhenLoginBelongsToDeletedUser_ShouldStillViolateUniqueIndex()
        {
            // A deleted account keeps its login: re-import restores it instead of creating a duplicate.
            var user = NewUser("jkowalski");
            await AddAsync(user);
            await DeleteAsync(user.Id);

            var exception = await Should.ThrowAsync<DbUpdateException>(
                () => AddAsync(NewUser("jkowalski")));

            exception.InnerException.ShouldBeOfType<PostgresException>()
                .SqlState.ShouldBe(UniqueViolation);
        }

        [Theory]
        [InlineData("JKowalski", "student")]
        [InlineData("jkowalski", "superuser")]
        public async Task Database_ShouldRejectInvalidRowsWrittenWithoutEf(string login, string role)
        {
            var exception = await Should.ThrowAsync<PostgresException>(() => ExecuteSqlAsync(
                "INSERT INTO core.users (id, login, first_name, last_name, role, created_at) " +
                $"VALUES (gen_random_uuid(), '{login}', 'Jan', 'Kowalski', '{role}', now())"));

            exception.SqlState.ShouldBe(CheckViolation);
        }

        private static User NewUser(string login, Role role = Role.Student)
        {
            return new User
            {
                Login = login,
                FirstName = "Jan",
                LastName = "Kowalski",
                Role = role,
                CreatedAt = DateTimeOffset.UtcNow
            };
        }

        private async Task AddAsync(User user)
        {
            using var scope = CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<IUserRepository>();

            await repository.AddAsync(user);
        }

        private async Task DeleteAsync(Guid userId)
        {
            using var scope = CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<IUserRepository>();

            var user = await repository.GetByIdAsync(userId);
            await repository.DeleteAsync(user!);
        }

        /// <summary>Reads the table directly, bypassing EF Core and its soft delete filter.</summary>
        private async Task<Dictionary<string, object>> QuerySingleRowAsync(string sql)
        {
            await using var connection = new NpgsqlConnection(Fixture.ConnectionString);
            await connection.OpenAsync();
            await using var command = new NpgsqlCommand(sql, connection);
            await using var reader = await command.ExecuteReaderAsync();

            (await reader.ReadAsync()).ShouldBeTrue("Expected exactly one row.");

            var row = Enumerable.Range(0, reader.FieldCount)
                .ToDictionary(reader.GetName, reader.GetValue);

            (await reader.ReadAsync()).ShouldBeFalse("Expected exactly one row.");

            return row;
        }

        private async Task ExecuteSqlAsync(string sql)
        {
            await using var connection = new NpgsqlConnection(Fixture.ConnectionString);
            await connection.OpenAsync();
            await using var command = new NpgsqlCommand(sql, connection);

            await command.ExecuteNonQueryAsync();
        }
    }
}
