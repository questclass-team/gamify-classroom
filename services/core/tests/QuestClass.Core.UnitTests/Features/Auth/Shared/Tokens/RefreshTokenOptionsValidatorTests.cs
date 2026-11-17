using QuestClass.Core.Features.Auth.Shared.Tokens;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Auth.Shared.Tokens
{
    public sealed class RefreshTokenOptionsValidatorTests
    {
        private readonly RefreshTokenOptionsValidator _validator = new();

        [Fact]
        public void Validate_WhenDefaults_ShouldSucceed()
        {
            _validator.Validate(null, new RefreshTokenOptions()).Succeeded.ShouldBeTrue();
        }

        [Theory]
        [InlineData(0)]
        [InlineData(9)]
        public void Validate_WhenSessionIsOutsideOneToEightHours_ShouldFail(int hours)
        {
            var result = _validator.Validate(null, new RefreshTokenOptions { SessionLifetimeHours = hours });

            result.Failed.ShouldBeTrue();
            result.FailureMessage.ShouldContain("'RefreshToken:SessionLifetimeHours'");
        }

        [Theory]
        [InlineData(-1)]
        [InlineData(301)]
        public void Validate_WhenGracePeriodIsOutOfRange_ShouldFail(int seconds)
        {
            var result = _validator.Validate(null, new RefreshTokenOptions { ReuseGracePeriodSeconds = seconds });

            result.Failed.ShouldBeTrue();
            result.FailureMessage.ShouldContain("'RefreshToken:ReuseGracePeriodSeconds'");
        }
    }
}
