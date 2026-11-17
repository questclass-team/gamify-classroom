using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared.Tokens;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Auth.Logout
{
    /// <summary>Ends the session of the refresh cookie. Always succeeds: logging out twice is not an error.</summary>
    public sealed class LogoutHandler
    {
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly TimeProvider _timeProvider;
        private readonly ILogger<LogoutHandler> _logger;

        public LogoutHandler(
            IRefreshTokenRepository refreshTokenRepository,
            TimeProvider timeProvider,
            ILogger<LogoutHandler> logger)
        {
            _refreshTokenRepository = refreshTokenRepository;
            _timeProvider = timeProvider;
            _logger = logger;
        }

        public async Task HandleAsync(string? refreshToken, CancellationToken cancellationToken = default)
        {
            if (refreshToken is null)
            {
                return;
            }

            var stored = await _refreshTokenRepository.GetByHashAsync(
                RefreshTokenGenerator.Hash(refreshToken),
                cancellationToken);

            if (stored is null)
            {
                return;
            }

            await _refreshTokenRepository.RevokeAsync(
                stored.Id,
                RefreshTokenRevocation.Logout,
                _timeProvider.GetUtcNow(),
                cancellationToken);

            _logger.LogInformation("User logged out. UserId: {UserId}", stored.UserId);
        }
    }
}
