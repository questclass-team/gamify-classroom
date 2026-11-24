using QuestClass.Core.Entities;

namespace QuestClass.Core.Features.Users.Shared
{
    /// <summary>Mappings used by more than one profile slice (read, nickname, avatar).</summary>
    public static class ProfileMappings
    {
        public static ProfileResponse ToProfileResponse(this User student)
        {
            return new ProfileResponse(student.Nickname, student.Avatar);
        }
    }
}
