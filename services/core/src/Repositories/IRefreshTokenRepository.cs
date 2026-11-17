using QuestClass.Core.Entities;

namespace QuestClass.Core.Repositories
{
    public interface IRefreshTokenRepository
    {
        Task AddAsync(RefreshToken token, CancellationToken cancellationToken = default);

        /// <summary>Any token with this hash, also revoked or expired ones (needed to detect reuse).</summary>
        Task<RefreshToken?> GetByHashAsync(string tokenHash, CancellationToken cancellationToken = default);

        /// <summary>
        /// Revokes <paramref name="current"/> as rotated and stores <paramref name="replacement"/> in one transaction.
        /// Returns false, changing nothing, when <paramref name="current"/> was already revoked, e.g. by a parallel
        /// refresh that won the race.
        /// </summary>
        Task<bool> TryRotateAsync(
            RefreshToken current,
            RefreshToken replacement,
            DateTimeOffset now,
            CancellationToken cancellationToken = default);

        /// <summary>Revokes the token if it is still active.</summary>
        Task RevokeAsync(
            Guid tokenId,
            RefreshTokenRevocation reason,
            DateTimeOffset now,
            CancellationToken cancellationToken = default);

        /// <summary>Revokes every active token of the user: ends all of the user's sessions.</summary>
        Task<int> RevokeAllForUserAsync(
            Guid userId,
            RefreshTokenRevocation reason,
            DateTimeOffset now,
            CancellationToken cancellationToken = default);

        /// <summary>Removes the user's tokens whose session has ended; they can no longer be used or reused.</summary>
        Task<int> DeleteExpiredAsync(Guid userId, DateTimeOffset now, CancellationToken cancellationToken = default);
    }
}
