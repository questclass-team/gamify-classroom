using QuestClass.Core.Entities;

namespace QuestClass.Core.Features.Auth.Shared
{
    /// <summary>Mappings used by more than one Auth slice (login and /auth/me).</summary>
    public static class AuthMappings
    {
        public static CurrentUserResponse ToCurrentUserResponse(this User user)
        {
            return new CurrentUserResponse(
                user.Id,
                user.Login,
                $"{user.FirstName} {user.LastName}".Trim(),
                user.Role.ToApiName());
        }
    }
}
