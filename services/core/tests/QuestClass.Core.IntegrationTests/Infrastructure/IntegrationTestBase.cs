using System.Net.Http.Headers;
using Microsoft.Extensions.DependencyInjection;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared.Tokens;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.IntegrationTests.Infrastructure
{
    /// <summary>Every test starts with empty tables.</summary>
    [Collection(IntegrationTestCollection.Name)]
    public abstract class IntegrationTestBase : IAsyncLifetime
    {
        protected IntegrationTestBase(IntegrationTestFixture fixture)
        {
            Fixture = fixture;
            Client = fixture.Factory.CreateClient();
        }

        protected IntegrationTestFixture Fixture { get; }

        protected HttpClient Client { get; }

        public Task InitializeAsync()
        {
            return Fixture.ResetDatabaseAsync();
        }

        public Task DisposeAsync()
        {
            Client.Dispose();
            return Task.CompletedTask;
        }

        /// <summary>
        /// A new DI scope is a new DbContext. Use separate scopes for "write" and "read" in one test,
        /// otherwise EF Core returns entities from its change tracker instead of reading the database.
        /// </summary>
        protected IServiceScope CreateScope()
        {
            return Fixture.Factory.Services.CreateScope();
        }

        /// <summary>An imported account, as the CSV import would create it.</summary>
        protected async Task<User> AddUserAsync(
            string login,
            Role role = Role.Student,
            string firstName = "Imported",
            string lastName = "Name")
        {
            var user = new User
            {
                Login = login,
                FirstName = firstName,
                LastName = lastName,
                Role = role,
                CreatedAt = DateTimeOffset.UtcNow
            };

            using var scope = CreateScope();
            await scope.ServiceProvider.GetRequiredService<IUserRepository>().AddAsync(user);

            return user;
        }

        /// <summary>A valid access token for the user, without going through the login endpoint.</summary>
        protected string IssueTokenFor(User user)
        {
            return Fixture.Factory.Services.GetRequiredService<IJwtTokenIssuer>().Issue(user).Token;
        }

        protected static void UseToken(HttpRequestMessage request, string token)
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
    }
}
