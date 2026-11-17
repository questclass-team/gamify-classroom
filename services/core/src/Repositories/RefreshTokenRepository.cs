using Microsoft.EntityFrameworkCore;
using QuestClass.Core.Common.Persistence;
using QuestClass.Core.Entities;

namespace QuestClass.Core.Repositories
{
    public sealed class RefreshTokenRepository : IRefreshTokenRepository
    {
        private readonly CoreDbContext _dbContext;

        public RefreshTokenRepository(CoreDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task AddAsync(RefreshToken token, CancellationToken cancellationToken = default)
        {
            _dbContext.RefreshTokens.Add(token);

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public Task<RefreshToken?> GetByHashAsync(string tokenHash, CancellationToken cancellationToken = default)
        {
            return _dbContext.RefreshTokens
                .AsNoTracking()
                .SingleOrDefaultAsync(token => token.TokenHash == tokenHash, cancellationToken);
        }

        public Task<bool> TryRotateAsync(
            RefreshToken current,
            RefreshToken replacement,
            DateTimeOffset now,
            CancellationToken cancellationToken = default)
        {
            // Retries are enabled on the connection, so a transaction must run inside the execution strategy.
            var strategy = _dbContext.Database.CreateExecutionStrategy();

            return strategy.ExecuteAsync(async () =>
            {
                // A retried attempt starts clean: the replacement may still be tracked from the failed one.
                _dbContext.Entry(replacement).State = EntityState.Detached;

                await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

                // Conditional UPDATE: of two parallel refreshes with the same token only one revokes it.
                var claimed = await _dbContext.RefreshTokens
                    .Where(token => token.Id == current.Id && token.RevokedAt == null)
                    .ExecuteUpdateAsync(
                        setters => setters
                            .SetProperty(token => token.RevokedAt, now)
                            .SetProperty(token => token.RevokedReason, RefreshTokenRevocation.Rotated)
                            .SetProperty(token => token.ReplacedByTokenId, replacement.Id),
                        cancellationToken);

                if (claimed == 0)
                {
                    return false;
                }

                _dbContext.RefreshTokens.Add(replacement);
                await _dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                return true;
            });
        }

        public Task RevokeAsync(
            Guid tokenId,
            RefreshTokenRevocation reason,
            DateTimeOffset now,
            CancellationToken cancellationToken = default)
        {
            return _dbContext.RefreshTokens
                .Where(token => token.Id == tokenId && token.RevokedAt == null)
                .ExecuteUpdateAsync(
                    setters => setters
                        .SetProperty(token => token.RevokedAt, now)
                        .SetProperty(token => token.RevokedReason, reason),
                    cancellationToken);
        }

        public Task<int> RevokeAllForUserAsync(
            Guid userId,
            RefreshTokenRevocation reason,
            DateTimeOffset now,
            CancellationToken cancellationToken = default)
        {
            return _dbContext.RefreshTokens
                .Where(token => token.UserId == userId && token.RevokedAt == null && token.ExpiresAt > now)
                .ExecuteUpdateAsync(
                    setters => setters
                        .SetProperty(token => token.RevokedAt, now)
                        .SetProperty(token => token.RevokedReason, reason),
                    cancellationToken);
        }

        public Task<int> DeleteExpiredAsync(Guid userId, DateTimeOffset now, CancellationToken cancellationToken = default)
        {
            // Hard delete is right here: refresh tokens are not soft-deletable records, just expired credentials.
            return _dbContext.RefreshTokens
                .Where(token => token.UserId == userId && token.ExpiresAt <= now)
                .ExecuteDeleteAsync(cancellationToken);
        }
    }
}
