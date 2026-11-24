using QuestClass.Core.Features.Users.UpdateProfile;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Users.UpdateProfile
{
    public sealed class UpdateProfileValidatorTests
    {
        private readonly UpdateProfileValidator _validator = new();

        [Theory]
        [InlineData("Cichy Lis")]
        [InlineData("  Łucznik_7  ")]
        [InlineData("Волк")]
        public void Validate_WhenNicknameIsValid_ShouldPass(string nickname)
        {
            _validator.Validate(new UpdateProfileRequest(nickname)).IsValid.ShouldBeTrue();
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void Validate_WhenNicknameIsMissing_ShouldFailUnderTheNicknameProperty(string? nickname)
        {
            var error = _validator.Validate(new UpdateProfileRequest(nickname!)).Errors.ShouldHaveSingleItem();

            error.PropertyName.ShouldBe("Nickname");
            error.ErrorMessage.ShouldBe("Nickname is required.");
        }

        [Theory]
        [InlineData("ab")]
        [InlineData("abcdefghijklmnopqrstuvwxy")]
        [InlineData("_lis")]
        [InlineData("lis.")]
        [InlineData("lis!")]
        public void Validate_WhenNicknameBreaksTheRules_ShouldFailUnderTheNicknameProperty(string nickname)
        {
            var error = _validator.Validate(new UpdateProfileRequest(nickname)).Errors.ShouldHaveSingleItem();

            error.PropertyName.ShouldBe("Nickname");
            error.ErrorMessage.ShouldBe(
                "Nickname must have 3 to 24 characters: letters, digits, spaces, '_', '-' or '.', and must start and " +
                "end with a letter or digit.");
        }
    }
}
