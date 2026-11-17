namespace QuestClass.Core.IntegrationTests.Infrastructure
{
    /// <summary>
    /// All integration tests share one database, so they run in this single collection, one after another.
    /// </summary>
    [CollectionDefinition(Name)]
    public sealed class IntegrationTestCollection : ICollectionFixture<IntegrationTestFixture>
    {
        public const string Name = "Integration";
    }
}
