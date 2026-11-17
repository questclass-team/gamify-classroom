using Microsoft.AspNetCore.Http;
using Microsoft.Net.Http.Headers;
using QuestClass.Core.Features.Auth.Shared.RefreshTokens;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Auth.Shared.RefreshTokens
{
    public sealed class RefreshTokenCookieTests
    {
        [Fact]
        public void Append_ShouldSetHttpOnlySecureStrictCookieLimitedToAuthEndpoints()
        {
            var context = new DefaultHttpContext();
            var expiresAt = new DateTimeOffset(2026, 11, 18, 17, 0, 0, TimeSpan.Zero);

            RefreshTokenCookie.Append(context.Response, new IssuedRefreshToken("token-value", expiresAt));

            var cookie = SetCookieHeaderValue.Parse(context.Response.Headers.SetCookie.ToString());
            cookie.Name.ToString().ShouldBe("qc_refresh");
            cookie.Value.ToString().ShouldBe("token-value");
            cookie.HttpOnly.ShouldBeTrue();
            cookie.Secure.ShouldBeTrue();
            cookie.SameSite.ShouldBe(Microsoft.Net.Http.Headers.SameSiteMode.Strict);
            cookie.Path.ToString().ShouldBe("/api/core/auth");
            cookie.Expires.ShouldBe(expiresAt);
        }

        [Fact]
        public void Delete_ShouldExpireTheCookieOnTheSamePath()
        {
            var context = new DefaultHttpContext();

            RefreshTokenCookie.Delete(context.Response);

            var cookie = SetCookieHeaderValue.Parse(context.Response.Headers.SetCookie.ToString());
            cookie.Name.ToString().ShouldBe("qc_refresh");
            cookie.Path.ToString().ShouldBe("/api/core/auth");
            cookie.Expires.ShouldNotBeNull().ShouldBeLessThan(DateTimeOffset.UtcNow);
        }

        [Theory]
        [InlineData("qc_refresh=abc", "abc")]
        [InlineData("other=1", null)]
        [InlineData("qc_refresh=", null)]
        public void Read_ShouldReturnTheTokenOrNull(string cookieHeader, string? expected)
        {
            var context = new DefaultHttpContext();
            context.Request.Headers.Cookie = cookieHeader;

            RefreshTokenCookie.Read(context.Request).ShouldBe(expected);
        }
    }
}
