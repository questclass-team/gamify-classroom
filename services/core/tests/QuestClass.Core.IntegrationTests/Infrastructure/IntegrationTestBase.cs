using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using QuestClass.Core.Common.Persistence;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared.Jwt;
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

        /// <summary>
        /// An imported account, as the CSV import would create it; <paramref name="nickname"/> as if the student had
        /// set it.
        /// </summary>
        protected async Task<User> AddUserAsync(
            string login,
            Role role = Role.Student,
            string firstName = "Imported",
            string lastName = "Name",
            string? nickname = null)
        {
            var user = new User
            {
                Login = login,
                FirstName = firstName,
                LastName = lastName,
                Nickname = nickname,
                Role = role,
                CreatedAt = DateTimeOffset.UtcNow
            };

            using var scope = CreateScope();
            await scope.ServiceProvider.GetRequiredService<IUserRepository>().AddAsync(user);

            return user;
        }

        /// <summary>A group of the teacher, saved directly instead of through the API.</summary>
        protected async Task<Group> AddGroupAsync(User teacher, string name = "Grupa testowa")
        {
            var group = new Group
            {
                Name = name,
                TeacherId = teacher.Id,
                CreatedAt = DateTimeOffset.UtcNow
            };

            using var scope = CreateScope();
            await scope.ServiceProvider.GetRequiredService<IGroupRepository>().AddAsync(group);

            return group;
        }

        /// <summary>Puts the student into the group directly in the database.</summary>
        protected async Task AddGroupMemberAsync(Group group, User student, DateTimeOffset? addedAt = null)
        {
            using var scope = CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();

            dbContext.GroupMembers.Add(new GroupMember
            {
                GroupId = group.Id,
                StudentId = student.Id,
                AddedAt = addedAt ?? DateTimeOffset.UtcNow
            });

            await dbContext.SaveChangesAsync();
        }

        /// <summary>Soft-deletes the row (the SoftDelete interceptor turns Remove into an UPDATE).</summary>
        protected async Task SoftDeleteAsync<TEntity>(TEntity entity)
            where TEntity : class
        {
            using var scope = CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<CoreDbContext>();

            dbContext.Remove(entity);
            await dbContext.SaveChangesAsync();
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

        /// <summary>Sends the request with an access token of <paramref name="caller"/>; <paramref name="json"/> is the body.</summary>
        protected Task<HttpResponseMessage> SendAsAsync(User caller, HttpMethod method, string url, object? json = null)
        {
            var request = new HttpRequestMessage(method, url);

            if (json is not null)
            {
                request.Content = JsonContent.Create(json);
            }

            UseToken(request, IssueTokenFor(caller));
            return Client.SendAsync(request);
        }
    }
}
