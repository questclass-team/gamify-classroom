using QuestClass.Core.Entities;
using QuestClass.Core.Features.Users.UpdateAvatar;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Users.UpdateAvatar
{
    public sealed class UpdateAvatarValidatorTests
    {
        private readonly UpdateAvatarValidator _validator = new();

        public static TheoryData<string> AllKeys => [.. Avatars.Keys];

        [Theory]
        [MemberData(nameof(AllKeys))]
        public void Validate_WhenAvatarIsAKnownKey_ShouldPass(string avatar)
        {
            _validator.Validate(new UpdateAvatarRequest(avatar)).IsValid.ShouldBeTrue();
        }

        [Fact]
        public void Validate_WhenAvatarIsNull_ShouldPassBecauseItRemovesTheAvatar()
        {
            _validator.Validate(new UpdateAvatarRequest(null)).IsValid.ShouldBeTrue();
        }

        [Theory]
        [InlineData("tiger")]
        [InlineData("Fox")]
        [InlineData(" fox ")]
        [InlineData("")]
        [InlineData("https://example.com/me.png")]
        public void Validate_WhenAvatarIsNotAKnownKey_ShouldFailListingTheKeys(string avatar)
        {
            var error = _validator.Validate(new UpdateAvatarRequest(avatar)).Errors.ShouldHaveSingleItem();

            error.PropertyName.ShouldBe("Avatar");
            error.ErrorMessage.ShouldStartWith("Avatar must be null or one of: fox, owl, hedgehog");
        }
    }
}
