using Microsoft.Extensions.Options;

namespace QuestClass.Core.Features.Auth.Shared.Ldap
{
    public sealed class LdapOptionsValidator : IValidateOptions<LdapOptions>
    {
        public ValidateOptionsResult Validate(string? name, LdapOptions options)
        {
            var failures = new List<string>();

            if (string.IsNullOrWhiteSpace(options.Host))
            {
                failures.Add("Configuration value 'Ldap:Host' is required.");
            }

            if (options.Port is < 1 or > 65535)
            {
                failures.Add("Configuration value 'Ldap:Port' must be between 1 and 65535.");
            }

            if (string.IsNullOrWhiteSpace(options.BaseDn))
            {
                failures.Add("Configuration value 'Ldap:BaseDn' is required.");
            }

            if (!options.BindTemplate.Contains(LdapOptions.LoginPlaceholder, StringComparison.Ordinal))
            {
                failures.Add($"Configuration value 'Ldap:BindTemplate' must contain '{LdapOptions.LoginPlaceholder}'.");
            }

            if (!options.UserFilterTemplate.Contains(LdapOptions.LoginPlaceholder, StringComparison.Ordinal))
            {
                failures.Add($"Configuration value 'Ldap:UserFilterTemplate' must contain '{LdapOptions.LoginPlaceholder}'.");
            }

            if (string.IsNullOrWhiteSpace(options.FirstNameAttribute) || string.IsNullOrWhiteSpace(options.LastNameAttribute))
            {
                failures.Add("Configuration values 'Ldap:FirstNameAttribute' and 'Ldap:LastNameAttribute' are required.");
            }

            if (options.TimeoutSeconds is < 1 or > 60)
            {
                failures.Add("Configuration value 'Ldap:TimeoutSeconds' must be between 1 and 60.");
            }

            return failures.Count == 0
                ? ValidateOptionsResult.Success
                : ValidateOptionsResult.Fail(failures);
        }
    }
}
