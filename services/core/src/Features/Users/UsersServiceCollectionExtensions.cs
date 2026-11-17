using QuestClass.Core.Features.Users.Import;

namespace QuestClass.Core.Features.Users
{
    public static class UsersServiceCollectionExtensions
    {
        /// <summary>Account import from CSV (admin).</summary>
        public static IServiceCollection AddUsersFeature(this IServiceCollection services)
        {
            services.AddScoped<ImportUsersHandler>();

            return services;
        }
    }
}
