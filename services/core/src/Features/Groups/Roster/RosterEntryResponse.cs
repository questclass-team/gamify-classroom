namespace QuestClass.Core.Features.Groups.Roster
{
    /// <summary>
    /// A current member of a group as anyone in the group may see them: id and nickname only, never a name or login
    /// (NFR-03).
    /// </summary>
    /// <param name="StudentId">The student's user id (the <c>sub</c> of their token).</param>
    /// <param name="Nickname">The student's nickname, or null until they set one. Never replaced by a name.</param>
    public sealed record RosterEntryResponse(Guid StudentId, string? Nickname);
}
