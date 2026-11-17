using QuestClass.Core.Features.Students.Search;

namespace QuestClass.Core.Features.Students
{
    public static class StudentsServiceCollectionExtensions
    {
        /// <summary>Searching student accounts (teacher).</summary>
        public static IServiceCollection AddStudentsFeature(this IServiceCollection services)
        {
            services.AddScoped<SearchStudentsHandler>();

            return services;
        }
    }
}
