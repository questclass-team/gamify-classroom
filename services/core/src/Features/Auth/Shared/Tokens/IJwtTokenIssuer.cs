using QuestClass.Core.Entities;

namespace QuestClass.Core.Features.Auth.Shared.Tokens
{
    public interface IJwtTokenIssuer
    {
        AccessToken Issue(User user);
    }
}
