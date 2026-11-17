using Microsoft.Extensions.Options;
using Novell.Directory.Ldap;

namespace QuestClass.Core.Features.Auth.Shared
{
    /// <summary>
    /// Verifies the password by binding to the directory as the user, then reads the user's names.
    /// The password is never stored or logged.
    /// </summary>
    public sealed class LdapAuthenticator : ILdapAuthenticator
    {
        private readonly LdapOptions _options;
        private readonly ILogger<LdapAuthenticator> _logger;

        public LdapAuthenticator(IOptions<LdapOptions> options, ILogger<LdapAuthenticator> logger)
        {
            _options = options.Value;
            _logger = logger;
        }

        public async Task<LdapUser?> AuthenticateAsync(
            string login,
            string password,
            CancellationToken cancellationToken = default)
        {
            // An empty password turns a bind into an anonymous ("unauthenticated") bind, which many servers
            // accept. Without this check anyone could log in as anybody with an empty password.
            if (string.IsNullOrWhiteSpace(login) || string.IsNullOrEmpty(password))
            {
                return null;
            }

            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

            using var connection = new LdapConnection
            {
                SecureSocketLayer = _options.UseSsl,
                ConnectionTimeout = _options.TimeoutSeconds * 1000
            };

            await connection.ConnectAsync(_options.Host, _options.Port, timeout.Token);

            try
            {
                var bindIdentity = Render(_options.BindTemplate, LdapEscaping.EscapeDnValue(login));
                await connection.BindAsync(bindIdentity, password, timeout.Token);
            }
            catch (LdapException exception) when (exception.ResultCode == LdapException.InvalidCredentials)
            {
                _logger.LogInformation("LDAP rejected the credentials of login {Login}", login);
                return null;
            }

            return await ReadNamesAsync(connection, login, timeout.Token);
        }

        private async Task<LdapUser> ReadNamesAsync(
            LdapConnection connection,
            string login,
            CancellationToken cancellationToken)
        {
            var filter = Render(_options.UserFilterTemplate, LdapEscaping.EscapeFilterValue(login));

            var results = await connection.SearchAsync(
                _options.BaseDn,
                LdapConnection.ScopeSub,
                filter,
                [_options.FirstNameAttribute, _options.LastNameAttribute],
                false,
                cancellationToken);

            if (!await results.HasMoreAsync(cancellationToken))
            {
                _logger.LogWarning("LDAP accepted login {Login} but its entry was not found by the user filter", login);
                return new LdapUser(null, null);
            }

            var attributes = (await results.NextAsync(cancellationToken)).GetAttributeSet();

            return new LdapUser(
                attributes.GetAttribute(_options.FirstNameAttribute)?.StringValue,
                attributes.GetAttribute(_options.LastNameAttribute)?.StringValue);
        }

        private string Render(string template, string escapedLogin)
        {
            return template
                .Replace(LdapOptions.LoginPlaceholder, escapedLogin, StringComparison.Ordinal)
                .Replace(LdapOptions.BaseDnPlaceholder, _options.BaseDn, StringComparison.Ordinal);
        }
    }
}
