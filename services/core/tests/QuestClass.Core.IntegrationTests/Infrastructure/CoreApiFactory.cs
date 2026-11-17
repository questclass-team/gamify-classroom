using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace QuestClass.Core.IntegrationTests.Infrastructure
{
    public sealed class CoreApiFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            // Placeholder until the database tests start a real PostgreSQL container.
            // Tests in this project do not open a database connection yet.
            builder.UseSetting(
                "ConnectionStrings:Core",
                "Host=localhost;Database=questclass_tests;Username=questclass");
        }
    }
}
