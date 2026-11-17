using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace QuestClass.Core.IntegrationTests.Infrastructure
{
    public sealed class CoreApiFactory : WebApplicationFactory<Program>
    {
        public const string JwtSecret = "integration-tests-secret-at-least-32-bytes";

        private readonly string _connectionString;

        public CoreApiFactory(string connectionString)
        {
            _connectionString = connectionString;
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("ConnectionStrings:Core", _connectionString);

            // Only satisfies startup validation: tests that run through the API never reach a real directory.
            builder.UseSetting("Ldap:Host", "ldap.invalid");
            builder.UseSetting("Ldap:BaseDn", "dc=labs,dc=questclass,dc=test");

            builder.UseSetting("Jwt:Secret", JwtSecret);
        }
    }
}
