using QuestClass.Core.Features.Auth.Shared.Ldap;

namespace QuestClass.Core.IntegrationTests.Infrastructure
{
    /// <summary>
    /// Stands in for the directory in API tests: a few accounts from infra/ldap, every password
    /// <see cref="Password"/>. The real directory adapter is tested in <c>LdapAuthenticatorTests</c>.
    /// </summary>
    public sealed class FakeLdapAuthenticator : ILdapAuthenticator
    {
        public const string Password = "haslo";

        private static readonly Dictionary<string, LdapUser> _directory = new()
        {
            ["admin"] = new LdapUser("Anna", "Administratorka"),
            ["nauczyciel"] = new LdapUser("Jan", "Kowalski"),
            ["mwisniewski"] = new LdapUser("Marek", "Wiśniewski"),
            ["student"] = new LdapUser("Ewa", "Nowak"),
            ["pzielinski"] = new LdapUser("Piotr", "Zieliński"),
            ["nowy"] = new LdapUser("Nowy", "Użytkownik")
        };

        public Task<LdapUser?> AuthenticateAsync(
            string login,
            string password,
            CancellationToken cancellationToken = default)
        {
            var user = password == Password && _directory.TryGetValue(login, out var directoryUser)
                ? directoryUser
                : null;

            return Task.FromResult(user);
        }
    }
}
