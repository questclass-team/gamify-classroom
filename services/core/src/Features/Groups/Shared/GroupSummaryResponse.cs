namespace QuestClass.Core.Features.Groups.Shared
{
    /// <summary>The <c>GroupSummary</c> shape the frontend expects (group list and the created group).</summary>
    /// <param name="Id">Group id; the game service stores its configuration under it.</param>
    /// <param name="Name">Group name.</param>
    /// <param name="StudentCount">Number of students in the group.</param>
    /// <param name="CreatedAt">When the group was created.</param>
    public sealed record GroupSummaryResponse(Guid Id, string Name, int StudentCount, DateTimeOffset CreatedAt);
}
