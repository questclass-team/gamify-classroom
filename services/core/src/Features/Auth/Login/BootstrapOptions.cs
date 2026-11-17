using QuestClass.Core.Entities;

namespace QuestClass.Core.Features.Auth.Login
{
    /// <summary>
    /// Solves "the first admin": accounts are created only by CSV import, which only an admin can run.
    /// A login listed here that passes LDAP but has never existed in the database is created as an admin
    /// on its first login. Example: <c>Bootstrap__AdminLogins=admin</c> (comma-separated).
    /// </summary>
    public sealed class BootstrapOptions
    {
        public const string SectionName = "Bootstrap";

        public string AdminLogins { get; init; } = string.Empty;

        public bool IsBootstrapAdmin(string login)
        {
            var normalizedLogin = User.NormalizeLogin(login);

            return AdminLogins
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Any(adminLogin => User.NormalizeLogin(adminLogin) == normalizedLogin);
        }
    }
}
