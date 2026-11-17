namespace QuestClass.Core.Features.Auth.Shared.RefreshTokens
{
    /// <summary>A refresh token in clear, on its way to the cookie. It is never stored or logged.</summary>
    public sealed record IssuedRefreshToken(string Token, DateTimeOffset ExpiresAt);
}
