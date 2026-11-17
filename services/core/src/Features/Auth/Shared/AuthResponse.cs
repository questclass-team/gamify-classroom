namespace QuestClass.Core.Features.Auth.Shared
{
    /// <summary>Body of a successful login or refresh. The refresh token travels only in an HttpOnly cookie.</summary>
    /// <param name="AccessToken">JWT to send as <c>Authorization: Bearer &lt;token&gt;</c>.</param>
    /// <param name="User">The logged-in user.</param>
    public sealed record AuthResponse(string AccessToken, CurrentUserResponse User);
}
