using QuestClass.Core.Features.Auth.Shared;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Auth.Shared
{
    public sealed class LdapEscapingTests
    {
        [Theory]
        [InlineData("jkowalski", "jkowalski")]
        [InlineData("j.kowalski-2", "j.kowalski-2")]
        [InlineData("admin,ou=people", @"admin\,ou\=people")]
        [InlineData("a+b\"c\\d<e>f;g", @"a\+b\""c\\d\<e\>f\;g")]
        [InlineData(" lead", @"\ lead")]
        [InlineData("#hash", @"\#hash")]
        [InlineData("trail ", @"trail\ ")]
        [InlineData("in#side", "in#side")]
        public void EscapeDnValue_ShouldEscapeRfc4514SpecialCharacters(string value, string expected)
        {
            LdapEscaping.EscapeDnValue(value).ShouldBe(expected);
        }

        [Theory]
        [InlineData("jkowalski", "jkowalski")]
        [InlineData("*", @"\2a")]
        [InlineData("*)(uid=*", @"\2a\29\28uid=\2a")]
        [InlineData(@"back\slash", @"back\5cslash")]
        public void EscapeFilterValue_ShouldEscapeRfc4515SpecialCharacters(string value, string expected)
        {
            LdapEscaping.EscapeFilterValue(value).ShouldBe(expected);
        }

        [Fact]
        public void EscapeFilterValue_ShouldEscapeNullCharacter()
        {
            LdapEscaping.EscapeFilterValue("a\0b").ShouldBe(@"a\00b");
            LdapEscaping.EscapeDnValue("a\0b").ShouldBe(@"a\00b");
        }
    }
}
