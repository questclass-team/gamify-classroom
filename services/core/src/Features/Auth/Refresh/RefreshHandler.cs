using Microsoft.Extensions.Options;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Jwt;
using QuestClass.Core.Features.Auth.Shared.RefreshTokens;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Auth.Refresh
{
    /// <summary>
    /// Exchanges the refresh cookie for a new access token and a new refresh token (rotation). A rotated token
    /// that is used again means it was copied: every session of the user is ended.
    /// </summary>
    public sealed class RefreshHandler
    {
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly IUserRepository _userRepository;
        private readonly IJwtTokenIssuer _tokenIssuer;
        private readonly RefreshTokenOptions _options;
        private readonly TimeProvider _timeProvider;
        private readonly ILogger<RefreshHandler> _logger;

        public RefreshHandler(
            IRefreshTokenRepository refreshTokenRepository,
            IUserRepository userRepository,
            IJwtTokenIssuer tokenIssuer,
            IOptions<RefreshTokenOptions> options,
            TimeProvider timeProvider,
            ILogger<RefreshHandler> logger)
        {
            _refreshTokenRepository = refreshTokenRepository;
            _userRepository = userRepository;
            _tokenIssuer = tokenIssuer;
            _options = options.Value;
            _timeProvider = timeProvider;
            _logger = logger;
        }

        public async Task<Result<AuthSession>> HandleAsync(
            string? refreshToken,
            CancellationToken cancellationToken = default)
        {
            if (refreshToken is null)
            {
                return Reject("no refresh cookie");
            }

            var now = _timeProvider.GetUtcNow();
            var stored = await _refreshTokenRepository.GetByHashAsync(
                RefreshTokenGenerator.Hash(refreshToken),
                cancellationToken);

            if (stored is null)
            {
                return Reject("unknown refresh token");
            }

            if (stored.ExpiresAt <= now)
            {
                return Reject("session expired", stored.UserId);
            }

            if (stored.RevokedAt is not null)
            {
                return await HandleRevokedTokenAsync(stored, now, cancellationToken);
            }

            // The database decides, not the old token: a deleted account or a changed role takes effect here.
            var user = await _userRepository.GetByIdAsync(stored.UserId, cancellationToken);

            if (user is null)
            {
                await _refreshTokenRepository.RevokeAsync(
                    stored.Id,
                    RefreshTokenRevocation.UserUnavailable,
                    now,
                    cancellationToken);

                return Reject("user no longer exists", stored.UserId);
            }

            // Rotation keeps the end of the session: refreshing never makes a session longer.
            var (replacement, issued) = RefreshTokenFactory.Create(user.Id, now, stored.ExpiresAt);

            if (!await _refreshTokenRepository.TryRotateAsync(stored, replacement, now, cancellationToken))
            {
                // A parallel request with the same cookie rotated it a moment ago; the browser keeps that new cookie.
                _logger.LogInformation("Concurrent refresh. UserId: {UserId}; cookie left unchanged", user.Id);

                return Result<AuthSession>.Success(CreateSession(user, refreshToken: null));
            }

            _logger.LogInformation("Session refreshed. UserId: {UserId}", user.Id);

            return Result<AuthSession>.Success(CreateSession(user, issued));
        }

        private async Task<Result<AuthSession>> HandleRevokedTokenAsync(
            RefreshToken stored,
            DateTimeOffset now,
            CancellationToken cancellationToken)
        {
            if (stored.RevokedReason != RefreshTokenRevocation.Rotated)
            {
                return Reject($"token revoked ({stored.RevokedReason})", stored.UserId);
            }

            var gracePeriod = TimeSpan.FromSeconds(_options.ReuseGracePeriodSeconds);

            if (now - stored.RevokedAt <= gracePeriod)
            {
                // Two tabs refreshed at the same moment: not theft. Same answer as the losing side of a race.
                var user = await _userRepository.GetByIdAsync(stored.UserId, cancellationToken);

                return user is null
                    ? Reject("user no longer exists", stored.UserId)
                    : Result<AuthSession>.Success(CreateSession(user, refreshToken: null));
            }

            // A token that was replaced long ago came back: someone has a copy. End every session of the user.
            var revoked = await _refreshTokenRepository.RevokeAllForUserAsync(
                stored.UserId,
                RefreshTokenRevocation.ReuseDetected,
                now,
                cancellationToken);

            _logger.LogWarning(
                "Refresh token reuse detected. UserId: {UserId}; all {Count} active sessions revoked",
                stored.UserId,
                revoked);

            return Result<AuthSession>.Failure(AuthErrors.InvalidRefreshToken());
        }

        private AuthSession CreateSession(User user, IssuedRefreshToken? refreshToken)
        {
            var accessToken = _tokenIssuer.Issue(user);

            return new AuthSession(new AuthResponse(accessToken.Token, user.ToCurrentUserResponse()), refreshToken);
        }

        private Result<AuthSession> Reject(string reason, Guid? userId = null)
        {
            _logger.LogInformation("Refresh rejected. UserId: {UserId}, reason: {Reason}", userId, reason);

            return Result<AuthSession>.Failure(AuthErrors.InvalidRefreshToken());
        }
    }
}
