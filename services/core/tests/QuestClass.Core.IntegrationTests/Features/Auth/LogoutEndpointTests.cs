using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using QuestClass.Core.IntegrationTests.Infrastructure;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Auth
{
    public sealed class LogoutEndpointTests : IntegrationTestBase
    {
        private readonly SessionClient _session;

        public LogoutEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
            _session = new SessionClient(
                fixture.Factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false }));
        }

        [Fact]
        public async Task Logout_ShouldEndTheSessionAndClearTheCookie()
        {
            await AddUserAsync("student");
            var (_, cookie) = await _session.LoginAsync("student");

            // No Authorization header: logging out must work after the access token has expired.
            var response = await _session.LogoutAsync(cookie);

            response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
            SessionClient.FindRefreshCookie(response)!.Expires!.Value.ShouldBeLessThan(DateTimeOffset.UtcNow);
            (await _session.RefreshAsync(cookie)).StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Logout_ShouldNotEndTheUsersOtherSessions()
        {
            await AddUserAsync("student");
            var (_, laptopCookie) = await _session.LoginAsync("student");
            var (_, phoneCookie) = await _session.LoginAsync("student");

            await _session.LogoutAsync(laptopCookie);

            (await _session.RefreshAsync(phoneCookie)).StatusCode.ShouldBe(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Logout_WithoutCookieOrTwice_ShouldStillSucceed()
        {
            await AddUserAsync("student");
            var (_, cookie) = await _session.LoginAsync("student");
            await _session.LogoutAsync(cookie);

            (await _session.LogoutAsync(cookie)).StatusCode.ShouldBe(HttpStatusCode.NoContent);
            (await _session.LogoutAsync(null)).StatusCode.ShouldBe(HttpStatusCode.NoContent);
        }
    }
}
