using QuestClass.Core.Features.Auth.Shared;

namespace QuestClass.Core.Features.Auth.Login
{
    /// <param name="AccessToken">JWT to send as <c>Authorization: Bearer &lt;token&gt;</c>.</param>
    /// <param name="User">The logged-in user.</param>
    public sealed record LoginResponse(string AccessToken, CurrentUserResponse User);
}
