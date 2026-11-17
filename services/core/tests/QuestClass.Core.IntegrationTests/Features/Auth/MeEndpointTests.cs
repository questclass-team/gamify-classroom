using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Login;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.IntegrationTests.Infrastructure;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Auth
{
    public sealed class MeEndpointTests : IntegrationTestBase
    {
        private const string MeUrl = "/api/core/auth/me";

        public MeEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task Me_WithoutToken_ShouldReturnUnauthorizedProblem()
        {
            var response = await Client.GetAsync(MeUrl);

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Me_WithTokenFromLogin_ShouldReturnTheLoggedInUser()
        {
            var user = await AddUserAsync("student");
            var login = await Client.PostAsJsonAsync("/api/core/auth/login", new { login = "student", password = "haslo" });
            var token = (await login.Content.ReadFromJsonAsync<LoginResponse>())!.AccessToken;

            var response = await GetMeAsync(token);

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<CurrentUserResponse>();
            body.ShouldBe(new CurrentUserResponse(user.Id, "student", "Ewa Nowak", "student"));
        }

        [Fact]
        public async Task Me_WhenRoleChangedAfterLogin_ShouldReturnRoleFromDatabase()
        {
            var user = await AddUserAsync("nauczyciel", Role.Student);
            var token = IssueTokenFor(user);

            using (var scope = CreateScope())
            {
                var repository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
                var stored = (await repository.GetByIdAsync(user.Id))!;
                stored.Role = Role.Teacher;
                await repository.UpdateAsync(stored);
            }

            var response = await GetMeAsync(token);

            (await response.Content.ReadFromJsonAsync<CurrentUserResponse>())!.Role.ShouldBe("teacher");
        }

        [Fact]
        public async Task Me_WhenAccountWasDeletedAfterLogin_ShouldEndTheSession()
        {
            var user = await AddUserAsync("student");
            var token = IssueTokenFor(user);

            using (var scope = CreateScope())
            {
                var repository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
                await repository.DeleteAsync((await repository.GetByIdAsync(user.Id))!);
            }

            var response = await GetMeAsync(token);

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
            problem.Title().ShouldBe("Auth.SessionUserNotFound");
        }

        [Fact]
        public async Task Me_WithTokenSignedWithAnotherSecret_ShouldReturnUnauthorized()
        {
            var user = await AddUserAsync("student");
            var foreignIssuer = new JwtTokenIssuer(
                Options.Create(new JwtOptions { Secret = "a-different-secret-that-is-32-bytes!" }),
                TimeProvider.System);

            var response = await GetMeAsync(foreignIssuer.Issue(user).Token);

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Me_WithExpiredToken_ShouldReturnUnauthorized()
        {
            var user = await AddUserAsync("student");
            var issuedAnHourAgo = new JwtTokenIssuer(
                Options.Create(new JwtOptions { Secret = CoreApiFactory.JwtSecret }),
                new ShiftedTimeProvider(TimeSpan.FromHours(-1)));

            var response = await GetMeAsync(issuedAnHourAgo.Issue(user).Token);

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
            response.Headers.WwwAuthenticate.ToString().ShouldContain("expired");
        }

        private Task<HttpResponseMessage> GetMeAsync(string token)
        {
            var request = new HttpRequestMessage(HttpMethod.Get, MeUrl);
            UseToken(request, token);
            return Client.SendAsync(request);
        }

        private sealed class ShiftedTimeProvider(TimeSpan shift) : TimeProvider
        {
            public override DateTimeOffset GetUtcNow()
            {
                return System.GetUtcNow().Add(shift);
            }
        }
    }
}
