using QuestClass.Core.Entities;

namespace QuestClass.Core.Features.Auth.Shared
{
    public interface IJwtTokenIssuer
    {
        AccessToken Issue(User user);
    }

    /// <summary>Signed JWT sent as <c>Authorization: Bearer &lt;Token&gt;</c>.</summary>
    public sealed record AccessToken(string Token, DateTimeOffset ExpiresAt);
}
