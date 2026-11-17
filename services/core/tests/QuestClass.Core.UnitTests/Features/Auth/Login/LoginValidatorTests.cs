using QuestClass.Core.Features.Auth.Login;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Auth.Login
{
    public sealed class LoginValidatorTests
    {
        private readonly LoginValidator _validator = new();

        [Theory]
        [InlineData("student")]
        [InlineData("j.kowalski")]
        [InlineData("jan_kowalski-2")]
        [InlineData("  Student  ")]
        public void Validate_WhenLoginAndPasswordAreValid_ShouldPass(string login)
        {
            var result = _validator.Validate(new LoginRequest(login, "haslo"));

            result.IsValid.ShouldBeTrue();
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void Validate_WhenLoginIsMissing_ShouldFail(string? login)
        {
            var result = _validator.Validate(new LoginRequest(login!, "haslo"));

            result.Errors.ShouldHaveSingleItem().ErrorMessage.ShouldBe("Login is required.");
        }

        [Theory]
        [InlineData("*")]
        [InlineData("student)(uid=*")]
        [InlineData("admin,ou=people")]
        [InlineData("jan kowalski")]
        [InlineData("łukasz")]
        public void Validate_WhenLoginHasCharactersOutsideTheAllowedSet_ShouldFail(string login)
        {
            var result = _validator.Validate(new LoginRequest(login, "haslo"));

            result.Errors.ShouldHaveSingleItem().ErrorMessage
                .ShouldBe("Login may contain only letters, digits, '.', '_' and '-'.");
        }

        [Fact]
        public void Validate_WhenLoginIsTooLong_ShouldFail()
        {
            var result = _validator.Validate(new LoginRequest(new string('a', 65), "haslo"));

            result.Errors.ShouldHaveSingleItem().ErrorMessage.ShouldBe("Login must not exceed 64 characters.");
        }

        [Theory]
        [InlineData("")]
        [InlineData(null)]
        public void Validate_WhenPasswordIsMissing_ShouldFail(string? password)
        {
            var result = _validator.Validate(new LoginRequest("student", password!));

            result.Errors.ShouldHaveSingleItem().ErrorMessage.ShouldBe("Password is required.");
        }

        [Fact]
        public void Validate_WhenPasswordIsTooLong_ShouldFail()
        {
            var result = _validator.Validate(new LoginRequest("student", new string('x', 257)));

            result.Errors.ShouldHaveSingleItem().ErrorMessage.ShouldBe("Password must not exceed 256 characters.");
        }
    }
}
