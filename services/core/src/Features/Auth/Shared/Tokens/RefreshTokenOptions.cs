namespace QuestClass.Core.Features.Auth.Shared.Tokens
{
    public sealed class RefreshTokenOptions
    {
        public const string SectionName = "RefreshToken";

        /// <summary>
        /// Maximum length of a login session (NFR-01: 8 hours). Refreshing does not extend it; after it the user
        /// logs in again.
        /// </summary>
        public int SessionLifetimeHours { get; init; } = 8;

        /// <summary>
        /// A token rotated less than this ago is not treated as stolen when it arrives again: two browser tabs may
        /// refresh at the same moment with the same cookie. Such a request gets a new access token, no new cookie.
        /// </summary>
        public int ReuseGracePeriodSeconds { get; init; } = 30;
    }
}
