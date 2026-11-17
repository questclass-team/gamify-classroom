using QuestClass.Core.Features.Auth.Shared;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Auth.Shared
{
    public sealed class LdapOptionsValidatorTests
    {
        private readonly LdapOptionsValidator _validator = new();

        [Fact]
        public void Validate_WhenHostAndBaseDnAreSetAndRestIsDefault_ShouldSucceed()
        {
            var result = _validator.Validate(null, ValidOptions());

            result.Succeeded.ShouldBeTrue();
        }

        [Fact]
        public void Validate_WhenHostAndBaseDnAreMissing_ShouldReportBoth()
        {
            var result = _validator.Validate(null, new LdapOptions());

            result.Failed.ShouldBeTrue();
            result.FailureMessage.ShouldContain("'Ldap:Host' is required");
            result.FailureMessage.ShouldContain("'Ldap:BaseDn' is required");
        }

        [Theory]
        [InlineData(0)]
        [InlineData(70000)]
        public void Validate_WhenPortIsOutOfRange_ShouldFail(int port)
        {
            var result = _validator.Validate(null, ValidOptions(port: port));

            result.Failed.ShouldBeTrue();
            result.FailureMessage.ShouldContain("'Ldap:Port'");
        }

        [Fact]
        public void Validate_WhenTemplatesHaveNoLoginPlaceholder_ShouldFail()
        {
            var options = ValidOptions(
                bindTemplate: "uid=admin,ou=people,{baseDn}",
                userFilterTemplate: "(objectClass=person)");

            var result = _validator.Validate(null, options);

            result.Failed.ShouldBeTrue();
            result.FailureMessage.ShouldContain("'Ldap:BindTemplate' must contain '{login}'");
            result.FailureMessage.ShouldContain("'Ldap:UserFilterTemplate' must contain '{login}'");
        }

        private static LdapOptions ValidOptions(
            int port = 389,
            string bindTemplate = "uid={login},ou=people,{baseDn}",
            string userFilterTemplate = "(uid={login})")
        {
            return new LdapOptions
            {
                Host = "ldap",
                Port = port,
                BaseDn = "dc=labs,dc=questclass,dc=test",
                BindTemplate = bindTemplate,
                UserFilterTemplate = userFilterTemplate
            };
        }
    }
}
