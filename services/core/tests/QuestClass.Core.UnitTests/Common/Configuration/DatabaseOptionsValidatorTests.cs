using QuestClass.Core.Common.Configuration;
using Shouldly;

namespace QuestClass.Core.UnitTests.Common.Configuration
{
    public sealed class DatabaseOptionsValidatorTests
    {
        private readonly DatabaseOptionsValidator _validator = new();

        [Fact]
        public void Validate_WhenConnectionStringIsComplete_ShouldSucceed()
        {
            var options = new DatabaseOptions
            {
                Core = "Host=localhost;Database=questclass;Username=questclass;Password=secret"
            };

            var result = _validator.Validate(null, options);

            result.Succeeded.ShouldBeTrue();
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void Validate_WhenConnectionStringIsMissing_ShouldFail(string connectionString)
        {
            var result = _validator.Validate(null, new DatabaseOptions { Core = connectionString });

            result.Failed.ShouldBeTrue();
            result.FailureMessage.ShouldContain("is required");
        }

        [Theory]
        [InlineData("Database=questclass;Username=questclass")]
        [InlineData("Host=localhost;Username=questclass")]
        [InlineData("Host=localhost;Database=questclass")]
        public void Validate_WhenRequiredPartIsMissing_ShouldFail(string connectionString)
        {
            var result = _validator.Validate(null, new DatabaseOptions { Core = connectionString });

            result.Failed.ShouldBeTrue();
            result.FailureMessage.ShouldContain("must contain Host, Database and Username");
        }

        [Fact]
        public void Validate_WhenConnectionStringIsMalformed_ShouldFail()
        {
            var result = _validator.Validate(null, new DatabaseOptions { Core = "not a connection string" });

            result.Failed.ShouldBeTrue();
            result.FailureMessage.ShouldContain("must be a valid PostgreSQL connection string");
        }
    }
}
