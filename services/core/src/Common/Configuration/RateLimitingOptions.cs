namespace QuestClass.Core.Common.Configuration
{
    public sealed class RateLimitingOptions
    {
        public const string SectionName = "RateLimiting";

        /// <summary>
        /// Login attempts allowed per client IP address per minute. Generous on purpose: a whole classroom
        /// can share one address. It slows password guessing down; the directory's own account lockout
        /// protects single accounts.
        /// </summary>
        public int LoginPermitsPerMinute { get; init; } = 20;
    }
}
