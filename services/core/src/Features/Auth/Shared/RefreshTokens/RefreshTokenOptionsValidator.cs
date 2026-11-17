using Microsoft.Extensions.Options;

namespace QuestClass.Core.Features.Auth.Shared.RefreshTokens
{
    public sealed class RefreshTokenOptionsValidator : IValidateOptions<RefreshTokenOptions>
    {
        /// <summary>NFR-01: a session lasts at most 8 hours.</summary>
        private const int MaximumSessionHours = 8;

        private const int MaximumGraceSeconds = 300;

        public ValidateOptionsResult Validate(string? name, RefreshTokenOptions options)
        {
            var failures = new List<string>();

            if (options.SessionLifetimeHours is < 1 or > MaximumSessionHours)
            {
                failures.Add(
                    $"Configuration value 'RefreshToken:SessionLifetimeHours' must be between 1 and {MaximumSessionHours}.");
            }

            if (options.ReuseGracePeriodSeconds is < 0 or > MaximumGraceSeconds)
            {
                failures.Add(
                    $"Configuration value 'RefreshToken:ReuseGracePeriodSeconds' must be between 0 and {MaximumGraceSeconds}.");
            }

            return failures.Count == 0
                ? ValidateOptionsResult.Success
                : ValidateOptionsResult.Fail(failures);
        }
    }
}
