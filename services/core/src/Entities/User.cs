using System.Text;
using System.Text.RegularExpressions;
using QuestClass.Core.Common.Persistence.SoftDelete;

namespace QuestClass.Core.Entities
{
    /// <summary>
    /// Account imported from CSV. The password is never stored: it is checked against LDAP on every login.
    /// </summary>
    public sealed partial class User : ISoftDeletable
    {
        public const int LoginMaxLength = 64;
        public const int NameMaxLength = 100;
        public const int NicknameMinLength = 3;
        public const int NicknameMaxLength = 24;

        private string _login = string.Empty;
        private string? _nickname;

        public Guid Id { get; init; } = Guid.CreateVersion7();

        /// <summary>Faculty LDAP login (LABS domain), always stored trimmed and lower-case.</summary>
        public required string Login
        {
            get => _login;
            set => _login = NormalizeLogin(value);
        }

        /// <summary>
        /// The student's public name in rankings (FR-21), the only name other students ever see (NFR-03). Null until
        /// the student sets it; always stored trimmed and in Unicode NFC. Unique across the system, ignoring letter
        /// case: the database enforces it (see <c>UserConfiguration</c>).
        /// </summary>
        public string? Nickname
        {
            get => _nickname;
            set => _nickname = value is null ? null : NormalizeNickname(value);
        }

        public required string FirstName { get; set; }

        public required string LastName { get; set; }

        /// <summary>"First Last", as the API shows the user. Not stored.</summary>
        public string DisplayName => $"{FirstName} {LastName}".Trim();

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

        /// <summary>
        /// A nickname (checked after <see cref="NormalizeNickname"/>) has <see cref="NicknameMinLength"/> to
        /// <see cref="NicknameMaxLength"/> characters: letters (with their combining marks) and digits of any script,
        /// spaces, '_', '-' and '.'; it starts and ends with a letter or digit.
        /// </summary>
        public static bool IsValidNickname(string nickname)
        {
            ArgumentNullException.ThrowIfNull(nickname);

            // The pattern runs first: it also rejects lone surrogates, on which Normalize would throw. Composing to
            // NFC never turns allowed characters into disallowed ones, it can only make the nickname shorter.
            var trimmedNickname = nickname.Trim();

            return AllowedNicknameCharacters().IsMatch(trimmedNickname) &&
                NormalizeNickname(trimmedNickname).Length is >= NicknameMinLength and <= NicknameMaxLength;
        }

        /// <summary>
        /// Trimmed and composed to Unicode NFC, so "ó" typed as "o" + accent is the same nickname as "ó".
        /// </summary>
        public static string NormalizeNickname(string nickname)
        {
            ArgumentNullException.ThrowIfNull(nickname);

            return nickname.Trim().Normalize(NormalizationForm.FormC);
        }

        [GeneratedRegex("^[a-z0-9._-]+$", RegexOptions.CultureInvariant)]
        private static partial Regex AllowedLoginCharacters();

        [GeneratedRegex(@"^[\p{L}\p{Nd}](?:[\p{L}\p{M}\p{Nd} ._-]*[\p{L}\p{M}\p{Nd}])?\z", RegexOptions.CultureInvariant)]
        private static partial Regex AllowedNicknameCharacters();
    }
}
