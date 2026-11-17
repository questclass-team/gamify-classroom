using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace QuestClass.Core.IntegrationTests.Infrastructure
{
    public sealed class CoreApiFactory : WebApplicationFactory<Program>
    {
        private readonly string _connectionString;

        public CoreApiFactory(string connectionString)
        {
            _connectionString = connectionString;
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("ConnectionStrings:Core", _connectionString);
        }
    }
}
