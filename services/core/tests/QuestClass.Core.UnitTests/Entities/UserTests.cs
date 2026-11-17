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
