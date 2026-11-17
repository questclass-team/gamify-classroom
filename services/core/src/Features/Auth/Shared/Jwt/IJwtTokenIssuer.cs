using QuestClass.Core.Entities;

namespace QuestClass.Core.Features.Auth.Shared.Jwt
{
    public interface IJwtTokenIssuer
    {
        AccessToken Issue(User user);
    }
}
