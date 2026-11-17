namespace QuestClass.Core.Features.Auth.Shared.Jwt
{
    /// <summary>
    /// Access token settings. The game service validates the same tokens, so <see cref="Secret"/>,
    /// <see cref="Issuer"/> and <see cref="Audience"/> must be shared with it.
    /// </summary>
    public sealed class JwtOptions
    {
        public const string SectionName = "Jwt";

        /// <summary>HS256 needs a key of at least 256 bits.</summary>
        public const int MinimumSecretBytes = 32;

        public string Secret { get; init; } = string.Empty;

        public string Issuer { get; init; } = "questclass-core";

        public string Audience { get; init; } = "questclass";

        public int AccessTokenLifetimeMinutes { get; init; } = 15;
    }
}
