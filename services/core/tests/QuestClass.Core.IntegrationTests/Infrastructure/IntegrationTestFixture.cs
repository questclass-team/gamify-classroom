using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using QuestClass.Core.Common.Persistence;
using Respawn;
using Respawn.Graph;
using Testcontainers.PostgreSql;

namespace QuestClass.Core.IntegrationTests.Infrastructure
{
    /// <summary>
    /// One PostgreSQL container and one API instance for the whole test run.
    /// The real migrations are applied once; <see cref="ResetDatabaseAsync"/> empties the tables between tests.
    /// </summary>
    public sealed class IntegrationTestFixture : IAsyncLifetime
    {
        // Same major version as docker-compose.yml.
        private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:18-alpine")
            .Build();

        private Respawner _respawner = null!;

        public CoreApiFactory Factory { get; private set; } = null!;

        public string ConnectionString => _postgres.GetConnectionString();

        public async Task InitializeAsync()
        {
            await _postgres.StartAsync();

            Factory = new CoreApiFactory(ConnectionString);

            using (var scope = Factory.Services.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();
                await dbContext.Database.MigrateAsync();
            }

            await using var connection = new NpgsqlConnection(ConnectionString);
            await connection.OpenAsync();

            _respawner = await Respawner.CreateAsync(connection, new RespawnerOptions
            {
                DbAdapter = DbAdapter.Postgres,
                SchemasToInclude = [CoreDbContext.Schema],
                TablesToIgnore = [new Table(CoreDbContext.Schema, "__EFMigrationsHistory")]
            });
        }

        public async Task ResetDatabaseAsync()
        {
            await using var connection = new NpgsqlConnection(ConnectionString);
            await connection.OpenAsync();

            await _respawner.ResetAsync(connection);
        }

        public async Task DisposeAsync()
        {
            await Factory.DisposeAsync();
            await _postgres.DisposeAsync();
        }
    }
}
