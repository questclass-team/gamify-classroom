namespace QuestClass.Core.Features.Auth.Shared
{
    /// <summary>The <c>CurrentUser</c> shape the frontend expects (login response and /auth/me).</summary>
    /// <param name="Id">User id.</param>
    /// <param name="Login">Faculty LDAP login, lower-case.</param>
    /// <param name="DisplayName">"First Last".</param>
    /// <param name="Role">"student", "teacher" or "admin".</param>
    public sealed record CurrentUserResponse(Guid Id, string Login, string DisplayName, string Role);
}
