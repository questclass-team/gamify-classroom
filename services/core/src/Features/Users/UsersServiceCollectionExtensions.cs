using QuestClass.Core.Features.Users.GetProfile;
using QuestClass.Core.Features.Users.Import;
using QuestClass.Core.Features.Users.UpdateAvatar;
using QuestClass.Core.Features.Users.UpdateProfile;

namespace QuestClass.Core.Features.Users
{
    public static class UsersServiceCollectionExtensions
    {
        /// <summary>Account import from CSV (admin) and the student's own profile (nickname, avatar).</summary>
        public static IServiceCollection AddUsersFeature(this IServiceCollection services)
        {
            services.AddScoped<ImportUsersHandler>();
            services.AddScoped<GetProfileHandler>();
            services.AddScoped<UpdateProfileHandler>();
            services.AddScoped<UpdateAvatarHandler>();

            return services;
        }
    }
}
