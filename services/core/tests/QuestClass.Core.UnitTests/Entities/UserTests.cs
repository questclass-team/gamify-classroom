using QuestClass.Core.Entities;
using Shouldly;

namespace QuestClass.Core.UnitTests.Entities
{
    public sealed class UserTests
    {
        [Theory]
        [InlineData("jkowalski", "jkowalski")]
        [InlineData("JKowalski", "jkowalski")]
        [InlineData("  jkowalski \t", "jkowalski")]
        public void NormalizeLogin_ShouldTrimAndLowerCase(string login, string expected)
        {
            User.NormalizeLogin(login).ShouldBe(expected);
        }

        [Theory]
        [InlineData("jkowalski", true)]
        [InlineData(" J.Kowalski_2-x ", true)]
        [InlineData("jan kowalski", false)]
        [InlineData("łukasz", false)]
        [InlineData("*", false)]
        [InlineData("admin,ou=people", false)]
        [InlineData("", false)]
        public void IsValidLogin_ShouldAllowOnlyLettersDigitsDotUnderscoreAndHyphen(string login, bool expected)
        {
            User.IsValidLogin(login).ShouldBe(expected);
        }

        [Fact]
        public void IsValidLogin_WhenLongerThanTheColumn_ShouldBeFalse()
        {
            User.IsValidLogin(new string('a', User.LoginMaxLength)).ShouldBeTrue();
            User.IsValidLogin(new string('a', User.LoginMaxLength + 1)).ShouldBeFalse();
        }

        [Fact]
        public void Login_WhenAssigned_ShouldBeStoredNormalized()
        {
            var user = new User
            {
                Login = " JKowalski ",
                FirstName = "Jan",
                LastName = "Kowalski",
                CreatedAt = DateTimeOffset.UtcNow
            };

            user.Login.ShouldBe("jkowalski");

            user.Login = "ANowak";

            user.Login.ShouldBe("anowak");
        }

        [Fact]
        public void NewUser_ShouldNotBeDeleted()
        {
            var user = new User
            {
                Login = "jkowalski",
                FirstName = "Jan",
                LastName = "Kowalski",
                CreatedAt = DateTimeOffset.UtcNow
            };

            user.IsDeleted.ShouldBeFalse();
            user.DeletedAt.ShouldBeNull();
            user.Id.ShouldNotBe(Guid.Empty);
        }

        [Theory]
        [InlineData("Jan", "Kowalski", "Jan Kowalski")]
        [InlineData("Jan", "", "Jan")]
        [InlineData("", "Kowalski", "Kowalski")]
        public void DisplayName_ShouldBeFirstAndLastNameWithoutStraySpaces(string firstName, string lastName, string expected)
        {
            var user = new User
            {
                Login = "jkowalski",
                FirstName = firstName,
                LastName = lastName,
                CreatedAt = DateTimeOffset.UtcNow
            };

            user.DisplayName.ShouldBe(expected);
        }

        [Theory]
        [InlineData("Cichy Lis")]
        [InlineData("abc")]
        [InlineData("123")]
        [InlineData("Łucznik_7")]
        [InlineData("a.b-c_d e")]
        [InlineData("Волк")]
        [InlineData("狐狸王")]
        [InlineData("نمر٣")]
        [InlineData("नमस्ते")]
        [InlineData("  Cichy Lis \t")]
        [InlineData("Lis  Cichy")]
        public void IsValidNickname_WhenLettersDigitsAndAllowedSeparators_ShouldBeTrue(string nickname)
        {
            User.IsValidNickname(nickname).ShouldBeTrue();
        }

        [Theory]
        [InlineData("")]
        [InlineData("ab")]
        [InlineData("  ab  ")]
        [InlineData("_abc")]
        [InlineData("-abc")]
        [InlineData(".abc")]
        [InlineData("abc.")]
        [InlineData("abc_")]
        [InlineData("ab!c")]
        [InlineData("a@bc")]
        [InlineData("ab\tc")]
        [InlineData("ab\ncd")]
        [InlineData("x²y")]
        [InlineData("lis 😀")]
        [InlineData("\u0301abc")]
        [InlineData("ab\u200Bcd")]
        public void IsValidNickname_WhenBreakingTheRules_ShouldBeFalse(string nickname)
        {
            User.IsValidNickname(nickname).ShouldBeFalse();
        }

        [Fact]
        public void IsValidNickname_ShouldMeasureTheTrimmedNfcNickname()
        {
            User.IsValidNickname(new string('a', User.NicknameMaxLength)).ShouldBeTrue();
            User.IsValidNickname($"  {new string('a', User.NicknameMaxLength)}  ").ShouldBeTrue();
            User.IsValidNickname(new string('a', User.NicknameMaxLength + 1)).ShouldBeFalse();

            // "é" typed as "e" + combining accent is two characters, but one after composing to NFC.
            var decomposed = string.Concat(Enumerable.Repeat("e\u0301", User.NicknameMaxLength));
            User.IsValidNickname(decomposed).ShouldBeTrue();
        }

        [Fact]
        public void IsValidNickname_WhenTextIsNotValidUtf16_ShouldBeFalseWithoutThrowing()
        {
            User.IsValidNickname("abc\uD800").ShouldBeFalse();
            User.IsValidNickname("\uDC00abc").ShouldBeFalse();
        }

        [Fact]
        public void NormalizeNickname_ShouldTrimAndComposeToNfc()
        {
            User.NormalizeNickname("  Kre\u0301t \t").ShouldBe("Krét");
        }

        [Fact]
        public void Nickname_ShouldBeNullUntilSetAndStoredNormalized()
        {
            var user = new User
            {
                Login = "kwojcik",
                FirstName = "Katarzyna",
                LastName = "Wójcik",
                CreatedAt = DateTimeOffset.UtcNow
            };

            user.Nickname.ShouldBeNull();

            user.Nickname = "  Cichy Lis ";

            user.Nickname.ShouldBe("Cichy Lis");
        }
    }
}
