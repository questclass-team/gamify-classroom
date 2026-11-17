using QuestClass.Core.Entities;

namespace QuestClass.Core.Features.Auth.Shared.Tokens
{
    public static class RefreshTokenFactory
    {
        /// <summary>
        /// A new refresh token of a session that ends at <paramref name="sessionExpiresAt"/>: the row to store
        /// (hash only) and the token for the cookie.
        /// </summary>
        public static (RefreshToken Stored, IssuedRefreshToken Issued) Create(
            Guid userId,
            DateTimeOffset now,
            DateTimeOffset sessionExpiresAt)
        {
            var (token, hash) = RefreshTokenGenerator.Create();

            var stored = new RefreshToken
            {
                UserId = userId,
                TokenHash = hash,
                CreatedAt = now,
                ExpiresAt = sessionExpiresAt
            };

            return (stored, new IssuedRefreshToken(token, sessionExpiresAt));
        }
    }
}
