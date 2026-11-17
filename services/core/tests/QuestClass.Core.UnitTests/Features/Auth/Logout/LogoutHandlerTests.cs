using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Logout;
using QuestClass.Core.Features.Auth.Shared.Tokens;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.UnitTests.Features.Auth.Logout
{
    public sealed class LogoutHandlerTests
    {
        private readonly IRefreshTokenRepository _refreshTokens = Substitute.For<IRefreshTokenRepository>();
        private readonly FakeTimeProvider _timeProvider = new(new DateTimeOffset(2026, 11, 18, 12, 0, 0, TimeSpan.Zero));
        private readonly LogoutHandler _handler;

        public LogoutHandlerTests()
        {
            _handler = new LogoutHandler(_refreshTokens, _timeProvider, NullLogger<LogoutHandler>.Instance);
        }

        [Fact]
        public async Task HandleAsync_WhenCookieBelongsToASession_ShouldRevokeItAsLogout()
        {
            var stored = new RefreshToken
            {
                UserId = Guid.CreateVersion7(),
                TokenHash = RefreshTokenGenerator.Hash("cookie-token"),
                CreatedAt = _timeProvider.GetUtcNow().AddHours(-1),
                ExpiresAt = _timeProvider.GetUtcNow().AddHours(7)
            };
            _refreshTokens.GetByHashAsync(stored.TokenHash, Arg.Any<CancellationToken>()).Returns(stored);

            await _handler.HandleAsync("cookie-token");

            await _refreshTokens.Received(1).RevokeAsync(
                stored.Id,
                RefreshTokenRevocation.Logout,
                _timeProvider.GetUtcNow(),
                Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task HandleAsync_WhenCookieIsUnknown_ShouldDoNothing()
        {
            await _handler.HandleAsync("never-issued");

            await _refreshTokens.DidNotReceiveWithAnyArgs().RevokeAsync(default, default, default, default);
        }

        [Fact]
        public async Task HandleAsync_WhenThereIsNoCookie_ShouldDoNothing()
        {
            await _handler.HandleAsync(null);

            await _refreshTokens.DidNotReceiveWithAnyArgs().GetByHashAsync(default!, default);
        }
    }
}
