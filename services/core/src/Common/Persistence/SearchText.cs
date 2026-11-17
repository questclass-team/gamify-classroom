using System.Text;

namespace QuestClass.Core.Common.Persistence
{
    /// <summary>
    /// Search text of a user: login, first and last name in lower case with Polish letters replaced by plain ones
    /// ("jkowalski jan kowalski" for Jan Kowalski), so "wojcik" finds "Wójcik". PostgreSQL computes the column
    /// itself (<see cref="ColumnSql"/>); a query is folded the same way by <see cref="Fold"/>.
    /// </summary>
    /// <remarks>
    /// Done with <c>translate</c> instead of the <c>unaccent</c> extension, which core_user may not install. Only
    /// Polish letters are folded; other accented letters must be typed as they are.
    /// </remarks>
    public static class SearchText
    {
        /// <summary>Shadow property of <c>User</c> (column <c>search_text</c>); it is not part of the entity class.</summary>
        public const string PropertyName = "SearchText";

        private const string PolishLetters = "ąćęłńóśźżĄĆĘŁŃÓŚŹŻ";
        private const string PlainLetters = "acelnoszzACELNOSZZ";

        /// <summary>Generated column of <c>core.users</c>; must stay in step with <see cref="Fold"/>.</summary>
        public const string ColumnSql =
            "lower(translate(login || ' ' || first_name || ' ' || last_name, '" + PolishLetters + "', '" + PlainLetters + "'))";

        /// <summary>The folding of <see cref="ColumnSql"/>, applied to a search query.</summary>
        public static string Fold(string text)
        {
            ArgumentNullException.ThrowIfNull(text);

            var folded = new StringBuilder(text.Length);

            foreach (var character in text)
            {
                var index = PolishLetters.IndexOf(character);
                folded.Append(index >= 0 ? PlainLetters[index] : character);
            }

            return folded.ToString().ToLowerInvariant();
        }
    }
}
