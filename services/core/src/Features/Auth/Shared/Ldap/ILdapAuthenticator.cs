namespace QuestClass.Core.Features.Auth.Shared.Ldap
{
    /// <summary>Checks a login and password against the faculty directory.</summary>
    public interface ILdapAuthenticator
    {
        /// <summary>
        /// Returns the person's names from the directory when the password is correct, or null when the login
        /// or password is wrong. Throws when the directory cannot be reached.
        /// </summary>
        Task<LdapUser?> AuthenticateAsync(string login, string password, CancellationToken cancellationToken = default);
    }
}
