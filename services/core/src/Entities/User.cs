using System.Text.RegularExpressions;
using QuestClass.Core.Common.Persistence;

namespace QuestClass.Core.Entities
{
    /// <summary>
    /// Account imported from CSV. The password is never stored: it is checked against LDAP on every login.
    /// </summary>
    public sealed partial class User : ISoftDeletable
    {
        public const int LoginMaxLength = 64;
        public const int NameMaxLength = 100;

        private string _login = string.Empty;

        public Guid Id { get; init; } = Guid.CreateVersion7();

        /// <summary>Faculty LDAP login (LABS domain), always stored trimmed and lower-case.</summary>
        public required string Login
        {
            get => _login;
            set => _login = NormalizeLogin(value);
        }

        public required string FirstName { get; set; }

        public required string LastName { get; set; }

        public Role Role { get; set; }

        public required DateTimeOffset CreatedAt { get; init; }

        public DateTimeOffset? LastLoginAt { get; set; }

        public bool IsDeleted { get; set; }

        public DateTimeOffset? DeletedAt { get; set; }

        /// <summary>
        /// Faculty logins are letters, digits, '.', '_' and '-' (checked after <see cref="NormalizeLogin"/>).
        /// Anything else could change the meaning of an LDAP query and could never log in, so it is rejected
        /// both at login and at CSV import.
        /// </summary>
        public static bool IsValidLogin(string login)
        {
            var normalizedLogin = NormalizeLogin(login);

            return normalizedLogin.Length <= LoginMaxLength && AllowedLoginCharacters().IsMatch(normalizedLogin);
        }

        /// <summary>LDAP logins are case-insensitive, so "JKowalski" and "jkowalski" are the same account.</summary>
        public static string NormalizeLogin(string login)
        {
            ArgumentNullException.ThrowIfNull(login);

            return login.Trim().ToLowerInvariant();
        }

        [GeneratedRegex("^[a-z0-9._-]+$", RegexOptions.CultureInvariant)]
        private static partial Regex AllowedLoginCharacters();
    }
}
