namespace QuestClass.Core.Entities
{
    /// <summary>
    /// One refresh token of a login session. Only the SHA-256 hash is stored, so a leaked database cannot be
    /// used to log in. Every refresh replaces the token with a new one (rotation); the old row stays, revoked,
    /// so that a second use of it is detected as theft.
    /// </summary>
    public sealed class RefreshToken
    {
        /// <summary>SHA-256 as lower-case hex.</summary>
        public const int TokenHashLength = 64;

        public Guid Id { get; init; } = Guid.CreateVersion7();

        public required Guid UserId { get; init; }

        public required string TokenHash { get; init; }

        public required DateTimeOffset CreatedAt { get; init; }

        /// <summary>End of the whole login session. Rotation keeps it, so a session never outlives it.</summary>
        public required DateTimeOffset ExpiresAt { get; init; }

        public DateTimeOffset? RevokedAt { get; set; }

        public RefreshTokenRevocation? RevokedReason { get; set; }

        /// <summary>The token that replaced this one on refresh.</summary>
        public Guid? ReplacedByTokenId { get; set; }

        public bool IsActive(DateTimeOffset now)
        {
            return RevokedAt is null && now < ExpiresAt;
        }
    }

    public enum RefreshTokenRevocation
    {
        /// <summary>Replaced by a new token on refresh.</summary>
        Rotated,

        Logout,

        /// <summary>An already rotated token was used again: every session of the user is ended.</summary>
        ReuseDetected,

        /// <summary>The user was deleted.</summary>
        UserUnavailable
    }
}
