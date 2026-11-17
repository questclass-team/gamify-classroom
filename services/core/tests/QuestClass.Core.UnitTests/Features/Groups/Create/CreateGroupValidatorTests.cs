using QuestClass.Core.Features.Groups.Create;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Groups.Create
{
    public sealed class CreateGroupValidatorTests
    {
        private readonly CreateGroupValidator _validator = new();

        [Theory]
        [InlineData("Programowanie obiektowe – grupa 3")]
        [InlineData("A")]
        [InlineData("  Ćwiczenia  ")]
        public void Validate_WhenNameIsValid_ShouldPass(string name)
        {
            _validator.Validate(new CreateGroupRequest(name)).IsValid.ShouldBeTrue();
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void Validate_WhenNameIsMissing_ShouldFail(string? name)
        {
            var result = _validator.Validate(new CreateGroupRequest(name!));

            result.Errors.ShouldHaveSingleItem().ErrorMessage.ShouldBe("Group name is required.");
        }

        [Fact]
        public void Validate_ShouldMeasureTheTrimmedName()
        {
            var longest = new string('a', 100);

            _validator.Validate(new CreateGroupRequest($"  {longest}  ")).IsValid.ShouldBeTrue();
            _validator.Validate(new CreateGroupRequest(longest + "a")).Errors.ShouldHaveSingleItem().ErrorMessage
                .ShouldBe("Group name must not exceed 100 characters.");
        }
    }
}
