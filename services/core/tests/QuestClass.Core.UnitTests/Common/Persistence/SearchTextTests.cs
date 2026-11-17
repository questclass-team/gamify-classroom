using QuestClass.Core.Common.Persistence;
using Shouldly;

namespace QuestClass.Core.UnitTests.Common.Persistence
{
    public sealed class SearchTextTests
    {
        [Theory]
        [InlineData("Wójcik", "wojcik")]
        [InlineData("ŁUCJA Żółć", "lucja zolc")]
        [InlineData("ąćęłńóśźż ĄĆĘŁŃÓŚŹŻ", "acelnoszz acelnoszz")]
        [InlineData("jkowalski", "jkowalski")]
        [InlineData("Müller", "müller")]
        public void Fold_ShouldLowerCaseAndReplacePolishLetters(string text, string expected)
        {
            SearchText.Fold(text).ShouldBe(expected);
        }

        [Fact]
        public void ColumnSql_ShouldUseTheSameLettersAsFold()
        {
            // The column and the query must fold identically, or a search would miss.
            SearchText.ColumnSql.ShouldContain("'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ', 'acelnoszzACELNOSZZ'");
            SearchText.Fold("ąćęłńóśźżĄĆĘŁŃÓŚŹŻ").ShouldBe("acelnoszzacelnoszz");
        }
    }
}
