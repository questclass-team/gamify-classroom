using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QuestClass.Core.Common.Configuration;
using QuestClass.Core.Common.Persistence.SoftDelete;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Common.Persistence
{
    public static class PersistenceServiceCollectionExtensions
    {
        /// <summary>
        /// The PostgreSQL database (schema <c>core</c>, snake_case names, soft delete), the repositories and the
        /// readiness check.
        /// </summary>
        public static IServiceCollection AddPersistence(this IServiceCollection services)
        {
            services
                .AddOptions<DatabaseOptions>()
                .BindConfiguration(DatabaseOptions.SectionName)
                .ValidateOnStart();

            services.AddSingleton<IValidateOptions<DatabaseOptions>, DatabaseOptionsValidator>();

            services.AddSingleton<SoftDeleteInterceptor>();

            services.AddDbContext<CoreDbContext>((serviceProvider, options) =>
            {
                var databaseOptions = serviceProvider
                    .GetRequiredService<IOptions<DatabaseOptions>>()
                    .Value;

                options.AddInterceptors(serviceProvider.GetRequiredService<SoftDeleteInterceptor>());

                options
                    .UseNpgsql(
                        databaseOptions.Core,
                        npgsqlOptions =>
                        {
                            npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", CoreDbContext.Schema);
                            npgsqlOptions.EnableRetryOnFailure(
                                maxRetryCount: 3,
                                maxRetryDelay: TimeSpan.FromSeconds(2),
                                errorCodesToAdd: null);
                        })
                    // Tables and columns as PostgreSQL expects them: users.first_name, not "Users"."FirstName".
                    .UseSnakeCaseNamingConvention();
            });

            services.AddScoped<IUserRepository, UserRepository>();
            services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
            services.AddScoped<IGroupRepository, GroupRepository>();

            // Readiness (/health/ready) fails while the database is unreachable.
            services
                .AddHealthChecks()
                .AddDbContextCheck<CoreDbContext>(name: "postgresql", tags: ["ready"]);

            return services;
        }
    }
}
