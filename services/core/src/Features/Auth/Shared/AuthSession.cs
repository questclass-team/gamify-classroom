using QuestClass.Core.Features.Auth.Shared.Tokens;

namespace QuestClass.Core.Features.Auth.Shared
{
    /// <summary>
    /// What a login or refresh handler produces: the response body, and the refresh token that the endpoint
    /// puts into the cookie. <paramref name="RefreshToken"/> is null when the cookie must stay as it is.
    /// </summary>
    public sealed record AuthSession(AuthResponse Response, IssuedRefreshToken? RefreshToken);
}
