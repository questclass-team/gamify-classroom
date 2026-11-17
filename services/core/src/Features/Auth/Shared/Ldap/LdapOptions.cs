namespace QuestClass.Core.Features.Auth.Shared.Ldap
{
    /// <summary>
    /// Directory that checks passwords (faculty LABS domain, or the test OpenLDAP from docker compose).
    /// Everything that depends on how the directory is organized is configurable, so switching to the
    /// faculty server only changes environment variables (<c>Ldap__Host</c>, <c>Ldap__BaseDn</c>, ...).
    /// </summary>
    public sealed class LdapOptions
    {
        public const string SectionName = "Ldap";

        /// <summary>Placeholder replaced with the escaped login.</summary>
        public const string LoginPlaceholder = "{login}";

        /// <summary>Placeholder replaced with <see cref="BaseDn"/>.</summary>
        public const string BaseDnPlaceholder = "{baseDn}";

        public string Host { get; init; } = string.Empty;

        public int Port { get; init; } = 389;

        /// <summary>LDAPS (usually port 636). Required for a real directory: the password travels to it.</summary>
        public bool UseSsl { get; init; }

        public string BaseDn { get; init; } = string.Empty;

        /// <summary>
        /// Identity used to bind with the user's password. OpenLDAP: a DN such as
        /// <c>uid={login},ou=people,{baseDn}</c>; Active Directory: a UPN such as <c>{login}@labs.example</c>.
        /// </summary>
        public string BindTemplate { get; init; } = "uid={login},ou=people,{baseDn}";

        /// <summary>Filter that finds the user's entry under <see cref="BaseDn"/> after a successful bind.</summary>
        public string UserFilterTemplate { get; init; } = "(uid={login})";

        public string FirstNameAttribute { get; init; } = "givenName";

        public string LastNameAttribute { get; init; } = "sn";

        public int TimeoutSeconds { get; init; } = 5;
    }
}
