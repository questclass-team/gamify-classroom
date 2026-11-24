namespace QuestClass.Core.Features.Groups.Roster
{
    /// <summary>
    /// A current member of a group as anyone in the group may see them: id, nickname and avatar only, never a name or
    /// login (NFR-03).
    /// </summary>
    /// <param name="StudentId">The student's user id (the <c>sub</c> of their token).</param>
    /// <param name="Nickname">The student's nickname, or null until they set one. Never replaced by a name.</param>
    /// <param name="Avatar">The student's avatar key (one of the ready-made set), or null for none.</param>
    public sealed record RosterEntryResponse(Guid StudentId, string? Nickname, string? Avatar);
}
