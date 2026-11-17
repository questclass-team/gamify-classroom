using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using QuestClass.Core.Features.Auth.Shared.Ldap;

namespace QuestClass.Core.IntegrationTests.Infrastructure
{
    public sealed class CoreApiFactory : WebApplicationFactory<Program>
    {
        public const string JwtSecret = "integration-tests-secret-at-least-32-bytes";
        public const string BootstrapAdminLogin = "admin";

        private readonly string _connectionString;

        public CoreApiFactory(string connectionString)
        {
            _connectionString = connectionString;
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("ConnectionStrings:Core", _connectionString);

            // Only satisfies startup validation: API tests use FakeLdapAuthenticator below.
            builder.UseSetting("Ldap:Host", "ldap.invalid");
            builder.UseSetting("Ldap:BaseDn", "dc=labs,dc=questclass,dc=test");

            builder.UseSetting("Jwt:Secret", JwtSecret);
            builder.UseSetting("Bootstrap:AdminLogins", BootstrapAdminLogin);

            // All tests share one client address; a dedicated test lowers this to check the limiter.
            builder.UseSetting("RateLimiting:LoginPermitsPerMinute", "10000");

            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<ILdapAuthenticator>();
                services.AddSingleton<ILdapAuthenticator, FakeLdapAuthenticator>();
            });
        }
    }
}
