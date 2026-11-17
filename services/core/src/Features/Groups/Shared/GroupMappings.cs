using QuestClass.Core.Entities;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Groups.Shared
{
    /// <summary>Mappings used by more than one Groups slice.</summary>
    public static class GroupMappings
    {
        public static GroupSummaryResponse ToGroupSummaryResponse(this Group group, int studentCount)
        {
            return new GroupSummaryResponse(group.Id, group.Name, studentCount, group.CreatedAt);
        }

        public static GroupStudentResponse ToGroupStudentResponse(this GroupStudent groupStudent)
        {
            return new GroupStudentResponse(
                groupStudent.Student.Id,
                groupStudent.Student.Login,
                groupStudent.Student.DisplayName,
                groupStudent.AddedAt);
        }
    }
}
