using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.IntegrationTests.Infrastructure;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Auth
{
    public sealed class LdapAuthenticatorTests : IClassFixture<LdapFixture>
    {
        private readonly LdapFixture _ldap;

        public LdapAuthenticatorTests(LdapFixture ldap)
        {
            _ldap = ldap;
        }

        [Fact]
        public async Task AuthenticateAsync_WhenPasswordIsCorrect_ShouldReturnNamesFromDirectory()
        {
            var user = await CreateAuthenticator().AuthenticateAsync("student", LdapFixture.Password);

            user.ShouldNotBeNull();
            user.FirstName.ShouldBe("Ewa");
            user.LastName.ShouldBe("Nowak");
        }

        [Fact]
        public async Task AuthenticateAsync_ShouldReadPolishCharacters()
        {
            var user = await CreateAuthenticator().AuthenticateAsync("mwisniewski", LdapFixture.Password);

            user.ShouldNotBeNull();
            user.LastName.ShouldBe("Wiśniewski");
        }

        [Fact]
        public async Task AuthenticateAsync_WhenPasswordIsWrong_ShouldReturnNull()
        {
            var user = await CreateAuthenticator().AuthenticateAsync("student", "wrong-password");

            user.ShouldBeNull();
        }

        [Fact]
        public async Task AuthenticateAsync_WhenLoginDoesNotExist_ShouldReturnNull()
        {
            var user = await CreateAuthenticator().AuthenticateAsync("nobody", LdapFixture.Password);

            user.ShouldBeNull();
        }

        [Fact]
        public async Task AuthenticateAsync_WhenPasswordIsEmpty_ShouldReturnNullInsteadOfAnonymousBind()
        {
            var user = await CreateAuthenticator().AuthenticateAsync("student", string.Empty);

            user.ShouldBeNull();
        }

        [Theory]
        [InlineData("*")]
        [InlineData("student)(uid=*")]
        [InlineData("student,ou=people")]
        public async Task AuthenticateAsync_WhenLoginContainsLdapSyntax_ShouldReturnNull(string login)
        {
            var user = await CreateAuthenticator().AuthenticateAsync(login, LdapFixture.Password);

            user.ShouldBeNull();
        }

        [Fact]
        public async Task AuthenticateAsync_WhenDirectoryIsUnreachable_ShouldThrow()
        {
            var authenticator = CreateAuthenticator(host: "127.0.0.1", port: 1);

            await Should.ThrowAsync<Exception>(
                () => authenticator.AuthenticateAsync("student", LdapFixture.Password));
        }

        private LdapAuthenticator CreateAuthenticator(string? host = null, int? port = null)
        {
            var options = new LdapOptions
            {
                Host = host ?? _ldap.Host,
                Port = port ?? _ldap.Port,
                BaseDn = LdapFixture.BaseDn
            };

            return new LdapAuthenticator(Options.Create(options), NullLogger<LdapAuthenticator>.Instance);
        }
    }
}
