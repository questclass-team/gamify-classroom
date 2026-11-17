using QuestClass.Core.Features.Auth.Shared;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Auth.Shared
{
    public sealed class BootstrapOptionsTests
    {
        [Theory]
        [InlineData("admin", "admin", true)]
        [InlineData("admin", "ADMIN", true)]
        [InlineData(" admin , kkavaliou ", "kkavaliou", true)]
        [InlineData("admin,kkavaliou", "student", false)]
        [InlineData("", "admin", false)]
        public void IsBootstrapAdmin_ShouldMatchCommaSeparatedLoginsInAnyCase(
            string adminLogins,
            string login,
            bool expected)
        {
            var options = new BootstrapOptions { AdminLogins = adminLogins };

            options.IsBootstrapAdmin(login).ShouldBe(expected);
        }
    }
}
