using QuestClass.Core.Features.Groups.AddStudent;
using QuestClass.Core.Features.Groups.Create;
using QuestClass.Core.Features.Groups.GetById;
using QuestClass.Core.Features.Groups.List;
using QuestClass.Core.Features.Groups.RemoveStudent;

namespace QuestClass.Core.Features.Groups
{
    public static class GroupsServiceCollectionExtensions
    {
        /// <summary>Teachers' class groups and their students.</summary>
        public static IServiceCollection AddGroupsFeature(this IServiceCollection services)
        {
            services.AddScoped<CreateGroupHandler>();
            services.AddScoped<ListGroupsHandler>();
            services.AddScoped<GetGroupHandler>();
            services.AddScoped<AddGroupStudentHandler>();
            services.AddScoped<RemoveGroupStudentHandler>();

            return services;
        }
    }
}
