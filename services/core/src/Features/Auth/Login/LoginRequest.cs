namespace QuestClass.Core.Features.Auth.Login
{
    /// <param name="Login">Faculty LDAP login (LABS domain), any letter case.</param>
    /// <param name="Password">LDAP password; checked by the directory, never stored.</param>
    public sealed record LoginRequest(string Login, string Password);
}
