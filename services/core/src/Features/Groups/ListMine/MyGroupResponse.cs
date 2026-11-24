namespace QuestClass.Core.Features.Groups.ListMine
{
    /// <summary>The <c>MyGroup</c> shape the frontend expects: a group the calling student is a member of.</summary>
    /// <param name="Id">Group id; the game service keeps the group's game data under it.</param>
    /// <param name="Name">Group name.</param>
    /// <param name="TeacherName">The teacher's "First Last".</param>
    /// <param name="JoinedAt">When the student was added to the group.</param>
    public sealed record MyGroupResponse(Guid Id, string Name, string TeacherName, DateTimeOffset JoinedAt);
}
