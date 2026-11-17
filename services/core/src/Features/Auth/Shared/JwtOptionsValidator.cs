using System.Text;
using Microsoft.Extensions.Options;

namespace QuestClass.Core.Features.Auth.Shared
{
    public sealed class JwtOptionsValidator : IValidateOptions<JwtOptions>
    {
        /// <summary>NFR-01: a session token is valid for at most 8 hours.</summary>
        private const int MaximumLifetimeMinutes = 8 * 60;

        public ValidateOptionsResult Validate(string? name, JwtOptions options)
        {
            var failures = new List<string>();

            if (Encoding.UTF8.GetByteCount(options.Secret) < JwtOptions.MinimumSecretBytes)
            {
                failures.Add(
                    $"Configuration value 'Jwt:Secret' must be at least {JwtOptions.MinimumSecretBytes} bytes long.");
            }

            if (string.IsNullOrWhiteSpace(options.Issuer))
            {
                failures.Add("Configuration value 'Jwt:Issuer' is required.");
            }

            if (string.IsNullOrWhiteSpace(options.Audience))
            {
                failures.Add("Configuration value 'Jwt:Audience' is required.");
            }

            if (options.AccessTokenLifetimeMinutes is < 1 or > MaximumLifetimeMinutes)
            {
                failures.Add(
                    $"Configuration value 'Jwt:AccessTokenLifetimeMinutes' must be between 1 and {MaximumLifetimeMinutes}.");
            }

            return failures.Count == 0
                ? ValidateOptionsResult.Success
                : ValidateOptionsResult.Fail(failures);
        }
    }
}
