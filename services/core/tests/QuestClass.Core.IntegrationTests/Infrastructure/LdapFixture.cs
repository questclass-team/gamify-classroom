using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using DotNet.Testcontainers.Images;

namespace QuestClass.Core.IntegrationTests.Infrastructure
{
    /// <summary>
    /// The team's test OpenLDAP (infra/ldap), built from its Dockerfile and seeded with the same test accounts
    /// as docker compose (infra/ldap/*.csv, every password <see cref="Password"/>).
    /// </summary>
    public sealed class LdapFixture : IAsyncLifetime
    {
        public const string BaseDn = "dc=labs,dc=questclass,dc=test";
        public const string Password = "haslo";

        private const int LdapPort = 389;

        private readonly IFutureDockerImage _image = new ImageFromDockerfileBuilder()
            .WithDockerfileDirectory(CommonDirectoryPath.GetGitDirectory(), "infra/ldap")
            .WithDockerfile("Dockerfile")
            .WithName("questclass-test-ldap:tests")
            .WithCleanUp(true)
            .Build();

        private IContainer _container = null!;

        public string Host => _container.Hostname;

        public int Port => _container.GetMappedPublicPort(LdapPort);

        public async Task InitializeAsync()
        {
            await _image.CreateAsync();

            _container = new ContainerBuilder(_image)
                .WithEnvironment("LDAP_BASE_DN", BaseDn)
                .WithEnvironment("LDAP_ADMIN_PASSWORD", "ldap-admin-test-password")
                .WithEnvironment("LDAP_TEST_USER_PASSWORD", Password)
                .WithPortBinding(LdapPort, true)
                .WithWaitStrategy(Wait.ForUnixContainer().UntilInternalTcpPortIsAvailable(LdapPort))
                .Build();

            await _container.StartAsync();
        }

        public async Task DisposeAsync()
        {
            await _container.DisposeAsync();
            await _image.DisposeAsync();
        }
    }
}
