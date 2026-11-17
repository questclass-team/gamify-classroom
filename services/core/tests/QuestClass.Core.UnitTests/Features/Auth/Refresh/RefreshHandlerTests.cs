using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Refresh;
using QuestClass.Core.Features.Auth.Shared.Tokens;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Auth.Refresh
{
    public sealed class RefreshHandlerTests
    {
        private const string Cookie = "cookie-token";

        private readonly IRefreshTokenRepository _refreshTokens = Substitute.For<IRefreshTokenRepository>();
        private readonly IUserRepository _users = Substitute.For<IUserRepository>();
        private readonly IJwtTokenIssuer _tokens = Substitute.For<IJwtTokenIssuer>();
        private readonly FakeTimeProvider _timeProvider = new(new DateTimeOffset(2026, 11, 18, 12, 0, 0, TimeSpan.Zero));
        private readonly User _user = new()
        {
            Login = "student",
            FirstName = "Ewa",
            LastName = "Nowak",
            Role = Role.Student,
            CreatedAt = DateTimeOffset.UtcNow
        };

        public RefreshHandlerTests()
        {
            _tokens.Issue(Arg.Any<User>()).Returns(new AccessToken("new-access-token", _timeProvider.GetUtcNow()));
            _users.GetByIdAsync(_user.Id, Arg.Any<CancellationToken>()).Returns(_user);
            _refreshTokens.TryRotateAsync(default!, default!, default, default).ReturnsForAnyArgs(true);
        }

        private DateTimeOffset Now => _timeProvider.GetUtcNow();

        [Fact]
        public async Task HandleAsync_WhenTokenIsActive_ShouldRotateItAndKeepTheSessionEnd()
        {
            var stored = StoreToken(expiresAt: Now.AddHours(5));

            var result = await CreateHandler().HandleAsync(Cookie);

            result.IsSuccess.ShouldBeTrue();
            result.Value.Response.AccessToken.ShouldBe("new-access-token");
            result.Value.Response.User.Login.ShouldBe("student");

            var issued = result.Value.RefreshToken.ShouldNotBeNull();
            issued.Token.ShouldNotBe(Cookie);
            issued.ExpiresAt.ShouldBe(stored.ExpiresAt);
            await _refreshTokens.Received(1).TryRotateAsync(
                stored,
                Arg.Is<RefreshToken>(replacement =>
                    replacement.UserId == _user.Id
                    && replacement.ExpiresAt == stored.ExpiresAt
                    && replacement.TokenHash == RefreshTokenGenerator.Hash(issued.Token)),
                Now,
                Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task HandleAsync_WhenCookieIsMissing_ShouldReject()
        {
            var result = await CreateHandler().HandleAsync(null);

            ShouldBeInvalidRefreshToken(result);
        }

        [Fact]
        public async Task HandleAsync_WhenTokenIsUnknown_ShouldReject()
        {
            var result = await CreateHandler().HandleAsync("never-issued");

            ShouldBeInvalidRefreshToken(result);
        }

        [Fact]
        public async Task HandleAsync_WhenSessionHasEnded_ShouldRejectWithoutRotating()
        {
            StoreToken(expiresAt: Now);

            var result = await CreateHandler().HandleAsync(Cookie);

            ShouldBeInvalidRefreshToken(result);
            await _refreshTokens.DidNotReceiveWithAnyArgs().TryRotateAsync(default!, default!, default, default);
        }

        [Fact]
        public async Task HandleAsync_WhenTokenWasLoggedOut_ShouldRejectWithoutEndingOtherSessions()
        {
            StoreToken(revokedAt: Now.AddMinutes(-10), reason: RefreshTokenRevocation.Logout);

            var result = await CreateHandler().HandleAsync(Cookie);

            ShouldBeInvalidRefreshToken(result);
            await _refreshTokens.DidNotReceiveWithAnyArgs().RevokeAllForUserAsync(default, default, default, default);
        }

        [Fact]
        public async Task HandleAsync_WhenRotatedTokenComesBackAfterGracePeriod_ShouldEndEverySessionOfTheUser()
        {
            StoreToken(revokedAt: Now.AddMinutes(-5), reason: RefreshTokenRevocation.Rotated);

            var result = await CreateHandler().HandleAsync(Cookie);

            ShouldBeInvalidRefreshToken(result);
            await _refreshTokens.Received(1).RevokeAllForUserAsync(
                _user.Id,
                RefreshTokenRevocation.ReuseDetected,
                Now,
                Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task HandleAsync_WhenRotatedTokenComesBackWithinGracePeriod_ShouldGiveAccessTokenAndKeepCookie()
        {
            // Two tabs refreshed at the same moment with the same cookie.
            StoreToken(revokedAt: Now.AddSeconds(-10), reason: RefreshTokenRevocation.Rotated);

            var result = await CreateHandler().HandleAsync(Cookie);

            result.IsSuccess.ShouldBeTrue();
            result.Value.Response.AccessToken.ShouldBe("new-access-token");
            result.Value.RefreshToken.ShouldBeNull();
            await _refreshTokens.DidNotReceiveWithAnyArgs().RevokeAllForUserAsync(default, default, default, default);
        }

        [Fact]
        public async Task HandleAsync_WhenParallelRequestRotatedFirst_ShouldGiveAccessTokenAndKeepCookie()
        {
            StoreToken(expiresAt: Now.AddHours(5));
            _refreshTokens.TryRotateAsync(default!, default!, default, default).ReturnsForAnyArgs(false);

            var result = await CreateHandler().HandleAsync(Cookie);

            result.IsSuccess.ShouldBeTrue();
            result.Value.RefreshToken.ShouldBeNull();
        }

        [Fact]
        public async Task HandleAsync_WhenUserWasDeleted_ShouldRevokeTheTokenAndReject()
        {
            var stored = StoreToken(expiresAt: Now.AddHours(5));
            _users.GetByIdAsync(_user.Id, Arg.Any<CancellationToken>()).Returns((User?)null);

            var result = await CreateHandler().HandleAsync(Cookie);

            ShouldBeInvalidRefreshToken(result);
            await _refreshTokens.Received(1).RevokeAsync(
                stored.Id,
                RefreshTokenRevocation.UserUnavailable,
                Now,
                Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task HandleAsync_ShouldIssueAccessTokenWithTheRoleFromTheDatabase()
        {
            StoreToken(expiresAt: Now.AddHours(5));
            _user.Role = Role.Teacher;

            var result = await CreateHandler().HandleAsync(Cookie);

            result.Value.Response.User.Role.ShouldBe("teacher");
            _tokens.Received(1).Issue(Arg.Is<User>(user => user.Role == Role.Teacher));
        }

        private RefreshHandler CreateHandler()
        {
            return new RefreshHandler(
                _refreshTokens,
                _users,
                _tokens,
                Options.Create(new RefreshTokenOptions()),
                _timeProvider,
                NullLogger<RefreshHandler>.Instance);
        }

        private RefreshToken StoreToken(
            DateTimeOffset? expiresAt = null,
            DateTimeOffset? revokedAt = null,
            RefreshTokenRevocation? reason = null)
        {
            var stored = new RefreshToken
            {
                UserId = _user.Id,
                TokenHash = RefreshTokenGenerator.Hash(Cookie),
                CreatedAt = Now.AddHours(-1),
                ExpiresAt = expiresAt ?? Now.AddHours(5),
                RevokedAt = revokedAt,
                RevokedReason = reason
            };

            _refreshTokens.GetByHashAsync(stored.TokenHash, Arg.Any<CancellationToken>()).Returns(stored);

            return stored;
        }

        private static void ShouldBeInvalidRefreshToken(Result result)
        {
            result.IsFailure.ShouldBeTrue();
            result.Error.Type.ShouldBe(ErrorType.Unauthorized);
            result.Error.Code.ShouldBe("Auth.InvalidRefreshToken");
        }
    }
}
