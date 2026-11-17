namespace QuestClass.Core.Features.Students.Search
{
    /// <summary>Query string of <c>GET /api/core/students</c>.</summary>
    public sealed class SearchStudentsRequest
    {
        /// <summary>
        /// Part of a login or of "First Last", at least 2 characters after trimming (a shorter query finds nothing).
        /// Letter case and Polish diacritics are ignored.
        /// </summary>
        public string? Query { get; init; }
    }
}
