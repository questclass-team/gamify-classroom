using Microsoft.Extensions.DependencyInjection;

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
    }
}
