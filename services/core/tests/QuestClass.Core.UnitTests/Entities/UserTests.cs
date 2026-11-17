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
    }
}
