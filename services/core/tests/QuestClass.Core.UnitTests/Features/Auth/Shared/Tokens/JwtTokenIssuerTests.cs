using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared.Authorization;
using QuestClass.Core.Features.Auth.Shared.Tokens;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Auth.Shared.Tokens
{
    public sealed class JwtTokenIssuerTests
    {
        private readonly JwtOptions _options = new() { Secret = "unit-tests-secret-at-least-32-bytes" };
        private readonly FakeTimeProvider _timeProvider = new(DateTimeOffset.UtcNow);
        private readonly JsonWebTokenHandler _handler = new();
        private readonly User _user = new()
        {
            Login = "nauczyciel",
            FirstName = "Jan",
            LastName = "Kowalski",
            Role = Role.Teacher,
            CreatedAt = DateTimeOffset.UtcNow
        };

        [Fact]
        public async Task Issue_ShouldCreateTokenThatPassesValidationWithUserClaims()
        {
            var accessToken = CreateIssuer().Issue(_user);

            var result = await ValidateAsync(accessToken.Token);

            result.IsValid.ShouldBeTrue();
            result.Claims[AuthClaims.UserId].ShouldBe(_user.Id.ToString());
            result.Claims[AuthClaims.Login].ShouldBe("nauczyciel");
            result.Claims[AuthClaims.Name].ShouldBe("Jan Kowalski");
            result.Claims[AuthClaims.Role].ShouldBe("teacher");
            result.Claims.ShouldContainKey(AuthClaims.TokenId);
        }

        [Fact]
        public void Issue_ShouldExpireAfterConfiguredLifetime()
        {
            var now = _timeProvider.GetUtcNow();

            var accessToken = CreateIssuer().Issue(_user);

            var expectedExpiry = DateTimeOffset.FromUnixTimeSeconds(now.AddMinutes(15).ToUnixTimeSeconds());
            accessToken.ExpiresAt.ShouldBe(expectedExpiry);
            new JsonWebToken(accessToken.Token).ValidTo.ShouldBe(expectedExpiry.UtcDateTime);
        }

        [Fact]
        public void Issue_ShouldGiveEveryTokenItsOwnId()
        {
            var issuer = CreateIssuer();

            var first = new JsonWebToken(issuer.Issue(_user).Token);
            var second = new JsonWebToken(issuer.Issue(_user).Token);

            first.Id.ShouldNotBe(second.Id);
        }

        [Fact]
        public async Task Validation_WhenRoleClaimWasTamperedWith_ShouldFail()
        {
            var token = CreateIssuer().Issue(_user).Token;
            var parts = token.Split('.');
            var payload = Encoding.UTF8.GetString(Base64UrlEncoder.DecodeBytes(parts[1]));
            var tamperedPayload = Base64UrlEncoder.Encode(payload.Replace("\"teacher\"", "\"admin\""));

            var result = await ValidateAsync($"{parts[0]}.{tamperedPayload}.{parts[2]}");

            result.IsValid.ShouldBeFalse();
        }

        [Fact]
        public async Task Validation_WhenTokenIsSignedWithAnotherSecret_ShouldFail()
        {
            var foreignOptions = new JwtOptions { Secret = "another-secret-that-is-also-32-bytes" };
            var token = new JwtTokenIssuer(Options.Create(foreignOptions), _timeProvider).Issue(_user).Token;

            var result = await ValidateAsync(token);

            result.IsValid.ShouldBeFalse();
        }

        [Fact]
        public async Task Validation_WhenTokenIsUnsigned_ShouldFail()
        {
            var unsignedToken = _handler.CreateToken(new SecurityTokenDescriptor
            {
                Issuer = _options.Issuer,
                Audience = _options.Audience,
                Expires = DateTime.UtcNow.AddMinutes(15),
                Claims = new Dictionary<string, object> { [AuthClaims.Role] = "admin" }
            });

            var result = await ValidateAsync(unsignedToken);

            result.IsValid.ShouldBeFalse();
        }

        [Fact]
        public async Task Validation_WhenTokenHasExpired_ShouldFail()
        {
            // Issued an hour ago with a 15-minute lifetime; the 30-second clock skew does not save it.
            var anHourAgo = new FakeTimeProvider(DateTimeOffset.UtcNow.AddHours(-1));
            var token = new JwtTokenIssuer(Options.Create(_options), anHourAgo).Issue(_user).Token;

            var result = await ValidateAsync(token);

            result.IsValid.ShouldBeFalse();
            result.Exception.ShouldBeOfType<SecurityTokenExpiredException>();
        }

        [Fact]
        public async Task Validation_WhenAudienceDiffers_ShouldFail()
        {
            var foreignOptions = new JwtOptions { Secret = _options.Secret, Audience = "another-app" };
            var token = new JwtTokenIssuer(Options.Create(foreignOptions), _timeProvider).Issue(_user).Token;

            var result = await ValidateAsync(token);

            result.IsValid.ShouldBeFalse();
        }

        private JwtTokenIssuer CreateIssuer()
        {
            return new JwtTokenIssuer(Options.Create(_options), _timeProvider);
        }

        private Task<TokenValidationResult> ValidateAsync(string token)
        {
            return _handler.ValidateTokenAsync(token, JwtValidation.CreateParameters(_options));
        }
    }
}
