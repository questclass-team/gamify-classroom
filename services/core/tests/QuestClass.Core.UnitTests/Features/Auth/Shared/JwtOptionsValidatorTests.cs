using QuestClass.Core.Features.Auth.Shared;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Auth.Shared
{
    public sealed class JwtOptionsValidatorTests
    {
        private const string ValidSecret = "unit-tests-secret-at-least-32-bytes";

        private readonly JwtOptionsValidator _validator = new();

        [Fact]
        public void Validate_WhenSecretIsLongEnoughAndRestIsDefault_ShouldSucceed()
        {
            var result = _validator.Validate(null, new JwtOptions { Secret = ValidSecret });

            result.Succeeded.ShouldBeTrue();
        }

        [Theory]
        [InlineData("")]
        [InlineData("too-short-secret")]
        public void Validate_WhenSecretIsShorterThan32Bytes_ShouldFail(string secret)
        {
            var result = _validator.Validate(null, new JwtOptions { Secret = secret });

            result.Failed.ShouldBeTrue();
            result.FailureMessage.ShouldContain("'Jwt:Secret' must be at least 32 bytes long");
        }

        [Theory]
        [InlineData(0)]
        [InlineData(481)]
        public void Validate_WhenLifetimeIsOutsideOneMinuteToEightHours_ShouldFail(int minutes)
        {
            var options = new JwtOptions { Secret = ValidSecret, AccessTokenLifetimeMinutes = minutes };

            var result = _validator.Validate(null, options);

            result.Failed.ShouldBeTrue();
            result.FailureMessage.ShouldContain("'Jwt:AccessTokenLifetimeMinutes'");
        }
    }
}
