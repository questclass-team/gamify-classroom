using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.JsonWebTokens;
using Npgsql;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.IntegrationTests.Infrastructure;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Auth
{
    public sealed class RefreshEndpointTests : IntegrationTestBase
    {
        private readonly SessionClient _session;

        public RefreshEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
            _session = new SessionClient(CreateClientWithoutCookieJar(fixture.Factory));
        }

        [Fact]
        public async Task Refresh_WithCookieFromLogin_ShouldReturnNewAccessTokenAndRotateTheCookie()
        {
            var user = await AddUserAsync("student");
            var (_, loginCookie) = await _session.LoginAsync("student");

            var response = await _session.RefreshAsync(loginCookie);

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            var body = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
            new JsonWebToken(body.AccessToken).Subject.ShouldBe(user.Id.ToString());
            body.User.Login.ShouldBe("student");

            var newCookie = SessionClient.FindRefreshCookie(response).ShouldNotBeNull();
            newCookie.Value.ToString().ShouldNotBe(loginCookie);
            newCookie.HttpOnly.ShouldBeTrue();

            (await GetMeStatusAsync(body.AccessToken)).ShouldBe(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Refresh_ShouldKeepTheEndOfTheSession()
        {
            await AddUserAsync("student");
            var (_, loginCookie) = await _session.LoginAsync("student");

            var response = await _session.RefreshAsync(loginCookie);

            // Both rows of the session (the rotated one and its replacement) end at the same moment.
            var endings = await QueryAsync<DateTime>("SELECT expires_at FROM core.refresh_tokens");
            endings.Count.ShouldBe(2);
            endings.Distinct().ShouldHaveSingleItem();
            SessionClient.FindRefreshCookie(response)!.Expires!.Value.UtcDateTime
                .ShouldBe(endings[0], TimeSpan.FromSeconds(1));
        }

        [Fact]
        public async Task Refresh_ShouldStoreOnlyHashesOfTheTokens()
        {
            await AddUserAsync("student");
            var (_, loginCookie) = await _session.LoginAsync("student");

            var hashes = await QueryAsync<string>("SELECT token_hash FROM core.refresh_tokens");

            hashes.ShouldHaveSingleItem().ShouldNotBe(loginCookie);
            hashes[0].Length.ShouldBe(64);
        }

        [Fact]
        public async Task Refresh_WithoutCookie_ShouldReturnUnauthorizedProblemAndClearTheCookie()
        {
            var response = await _session.RefreshAsync(null);

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
            problem.Title().ShouldBe("Auth.InvalidRefreshToken");
            SessionClient.FindRefreshCookie(response)!.Expires!.Value.ShouldBeLessThan(DateTimeOffset.UtcNow);
        }

        [Fact]
        public async Task Refresh_WithUnknownCookie_ShouldReturnUnauthorizedProblem()
        {
            var response = await _session.RefreshAsync("forged-cookie-value");

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Refresh_WhenOldCookieArrivesWithinGracePeriod_ShouldAnswerWithoutChangingTheCookie()
        {
            // Two browser tabs refreshing at the same moment send the same cookie.
            await AddUserAsync("student");
            var (_, loginCookie) = await _session.LoginAsync("student");
            var first = await _session.RefreshAsync(loginCookie);
            var newCookie = SessionClient.FindRefreshCookie(first)!.Value.ToString();

            var second = await _session.RefreshAsync(loginCookie);

            second.StatusCode.ShouldBe(HttpStatusCode.OK);
            SessionClient.FindRefreshCookie(second).ShouldBeNull();
            (await _session.RefreshAsync(newCookie)).StatusCode.ShouldBe(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Refresh_WhenOldCookieIsReusedAfterGracePeriod_ShouldEndEverySessionOfTheUser()
        {
            await using var factory = Fixture.Factory.WithWebHostBuilder(builder =>
                builder.UseSetting("RefreshToken:ReuseGracePeriodSeconds", "0"));
            var session = new SessionClient(CreateClientWithoutCookieJar(factory));
            await AddUserAsync("student");

            var (_, stolenCookie) = await session.LoginAsync("student");
            var rotated = await session.RefreshAsync(stolenCookie);
            var ownersCookie = SessionClient.FindRefreshCookie(rotated)!.Value.ToString();
            var (_, otherDeviceCookie) = await session.LoginAsync("student");

            var reuse = await session.RefreshAsync(stolenCookie);

            await reuse.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
            (await session.RefreshAsync(ownersCookie)).StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
            (await session.RefreshAsync(otherDeviceCookie)).StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Refresh_WhenSessionHasEnded_ShouldReturnUnauthorized()
        {
            await AddUserAsync("student");
            var (_, loginCookie) = await _session.LoginAsync("student");
            await ExecuteAsync("UPDATE core.refresh_tokens SET expires_at = now() - interval '1 minute'");

            var response = await _session.RefreshAsync(loginCookie);

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Refresh_WhenAccountWasDeleted_ShouldReturnUnauthorized()
        {
            var user = await AddUserAsync("student");
            var (_, loginCookie) = await _session.LoginAsync("student");
            using (var scope = CreateScope())
            {
                var repository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
                await repository.DeleteAsync((await repository.GetByIdAsync(user.Id))!);
            }

            var response = await _session.RefreshAsync(loginCookie);

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Refresh_WhenRoleChangedAfterLogin_ShouldPutTheNewRoleIntoTheToken()
        {
            await AddUserAsync("nauczyciel", Role.Student);
            var (_, loginCookie) = await _session.LoginAsync("nauczyciel");
            await ExecuteAsync("UPDATE core.users SET role = 'teacher' WHERE login = 'nauczyciel'");

            var response = await _session.RefreshAsync(loginCookie);

            var body = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
            body.User.Role.ShouldBe("teacher");
            new JsonWebToken(body.AccessToken).GetClaim("role").Value.ShouldBe("teacher");
        }

        private async Task<HttpStatusCode> GetMeStatusAsync(string accessToken)
        {
            var request = new HttpRequestMessage(HttpMethod.Get, "/api/core/auth/me");
            UseToken(request, accessToken);
            return (await Client.SendAsync(request)).StatusCode;
        }

        private static HttpClient CreateClientWithoutCookieJar(WebApplicationFactory<Program> factory)
        {
            return factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        }

        private async Task ExecuteAsync(string sql)
        {
            await using var connection = new NpgsqlConnection(Fixture.ConnectionString);
            await connection.OpenAsync();
            await new NpgsqlCommand(sql, connection).ExecuteNonQueryAsync();
        }

        private async Task<List<T>> QueryAsync<T>(string sql)
        {
            await using var connection = new NpgsqlConnection(Fixture.ConnectionString);
            await connection.OpenAsync();
            await using var reader = await new NpgsqlCommand(sql, connection).ExecuteReaderAsync();

            var values = new List<T>();
            while (await reader.ReadAsync())
            {
                values.Add(reader.GetFieldValue<T>(0));
            }

            return values;
        }
    }
}
