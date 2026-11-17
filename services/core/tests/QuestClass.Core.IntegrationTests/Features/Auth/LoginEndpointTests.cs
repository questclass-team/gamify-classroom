using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.JsonWebTokens;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Login;
using QuestClass.Core.IntegrationTests.Infrastructure;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Auth
{
    public sealed class LoginEndpointTests : IntegrationTestBase
    {
        private const string LoginUrl = "/api/core/auth/login";

        public LoginEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task Login_WhenImportedUserGivesCorrectPassword_ShouldReturnTokenAndUser()
        {
            var user = await AddUserAsync("nauczyciel", Role.Teacher);

            var response = await Client.PostAsJsonAsync(LoginUrl, new { login = "nauczyciel", password = "haslo" });

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            var body = (await response.Content.ReadFromJsonAsync<LoginResponse>())!;
            body.User.Id.ShouldBe(user.Id);
            body.User.Login.ShouldBe("nauczyciel");
            body.User.Role.ShouldBe("teacher");

            var token = new JsonWebToken(body.AccessToken);
            token.Subject.ShouldBe(user.Id.ToString());
            token.GetClaim("role").Value.ShouldBe("teacher");
        }

        [Fact]
        public async Task Login_ShouldRefreshNamesFromDirectoryAndRecordLoginTime()
        {
            var user = await AddUserAsync("mwisniewski", Role.Teacher, "Marek", "Wisniewski");

            var response = await Client.PostAsJsonAsync(LoginUrl, new { login = "mwisniewski", password = "haslo" });

            var body = (await response.Content.ReadFromJsonAsync<LoginResponse>())!;
            body.User.DisplayName.ShouldBe("Marek Wiśniewski");

            using var scope = CreateScope();
            var stored = await scope.ServiceProvider.GetRequiredService<IUserRepository>().GetByIdAsync(user.Id);
            stored!.LastName.ShouldBe("Wiśniewski");
            stored.LastLoginAt.ShouldNotBeNull();
        }

        [Fact]
        public async Task Login_ShouldAcceptLoginInAnyLetterCaseWithSurroundingSpaces()
        {
            await AddUserAsync("student");

            var response = await Client.PostAsJsonAsync(LoginUrl, new { login = "  Student ", password = "haslo" });

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Login_WhenPasswordIsWrong_ShouldReturnUnauthorizedProblem()
        {
            await AddUserAsync("student");

            var response = await Client.PostAsJsonAsync(LoginUrl, new { login = "student", password = "wrong" });

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
            problem.Title().ShouldBe("Auth.InvalidCredentials");
        }

        [Fact]
        public async Task Login_WhenLoginIsUnknownToDirectory_ShouldReturnSameAnswerAsWrongPassword()
        {
            var response = await Client.PostAsJsonAsync(LoginUrl, new { login = "nobody", password = "haslo" });

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
            problem.Title().ShouldBe("Auth.InvalidCredentials");
        }

        [Fact]
        public async Task Login_WhenAccountIsInDirectoryButNotImported_ShouldReturnForbiddenProblem()
        {
            var response = await Client.PostAsJsonAsync(LoginUrl, new { login = "nowy", password = "haslo" });

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.Forbidden);
            problem.Title().ShouldBe("Auth.AccountNotImported");
        }

        [Fact]
        public async Task Login_WhenBootstrapAdminLogsInFirstTime_ShouldCreateAdminAccount()
        {
            var response = await Client.PostAsJsonAsync(LoginUrl, new { login = "admin", password = "haslo" });

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            var body = (await response.Content.ReadFromJsonAsync<LoginResponse>())!;
            body.User.Role.ShouldBe("admin");
            body.User.DisplayName.ShouldBe("Anna Administratorka");

            using var scope = CreateScope();
            var stored = await scope.ServiceProvider.GetRequiredService<IUserRepository>().GetByLoginAsync("admin");
            stored.ShouldNotBeNull();
            stored.Role.ShouldBe(Role.Admin);
        }

        [Fact]
        public async Task Login_WhenBootstrapAdminAccountWasDeleted_ShouldNotRecreateIt()
        {
            var admin = await AddUserAsync("admin", Role.Admin);
            using (var scope = CreateScope())
            {
                var repository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
                await repository.DeleteAsync((await repository.GetByIdAsync(admin.Id))!);
            }

            var response = await Client.PostAsJsonAsync(LoginUrl, new { login = "admin", password = "haslo" });

            await response.ShouldBeProblemAsync(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Login_WhenPasswordFieldIsMissing_ShouldBeRejectedByFluentValidation()
        {
            // Regression: without SuppressImplicitRequiredAttributeForNonNullableReferenceTypes ASP.NET Core
            // answered a missing field itself, in another format, before FluentValidation ran.
            var response = await Client.PostAsJsonAsync(LoginUrl, new { login = "student" });

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.BadRequest);
            problem.Title().ShouldBe("Validation Failed");
            problem.GetProperty("errors").GetProperty("Password")[0].GetString().ShouldBe("Password is required.");
        }

        [Theory]
        [InlineData("*")]
        [InlineData("student)(uid=*")]
        [InlineData("student,ou=people")]
        public async Task Login_WhenLoginContainsLdapSyntax_ShouldBeRejectedBeforeReachingTheDirectory(string login)
        {
            var response = await Client.PostAsJsonAsync(LoginUrl, new { login, password = "haslo" });

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.BadRequest);
            problem.GetProperty("errors").GetProperty("Login")[0].GetString()
                .ShouldBe("Login may contain only letters, digits, '.', '_' and '-'.");
        }

        [Fact]
        public async Task Login_WhenTooManyAttemptsFromOneAddress_ShouldReturnTooManyRequestsProblem()
        {
            await using var factory = Fixture.Factory.WithWebHostBuilder(builder =>
                builder.UseSetting("RateLimiting:LoginPermitsPerMinute", "2"));
            using var client = factory.CreateClient();

            for (var attempt = 0; attempt < 2; attempt++)
            {
                var allowed = await client.SendAsync(WrongPasswordFrom("10.0.0.1"));
                allowed.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
            }

            var limited = await client.SendAsync(WrongPasswordFrom("10.0.0.1"));
            var problem = await limited.ShouldBeProblemAsync(HttpStatusCode.TooManyRequests);
            problem.Title().ShouldBe("Too Many Requests");

            // Behind nginx every client has its own limit, read from X-Forwarded-For.
            var otherClient = await client.SendAsync(WrongPasswordFrom("10.0.0.2"));
            otherClient.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        }

        private static HttpRequestMessage WrongPasswordFrom(string clientAddress)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, LoginUrl)
            {
                Content = JsonContent.Create(new { login = "student", password = "wrong" })
            };
            request.Headers.Add("X-Forwarded-For", clientAddress);
            return request;
        }
    }
}
