using QuestClass.Core.Features.Groups.Shared;

namespace QuestClass.Core.Features.Groups.GetById
{
    /// <summary>The <c>GroupDetail</c> shape the frontend expects.</summary>
    /// <param name="Id">Group id.</param>
    /// <param name="Name">Group name.</param>
    /// <param name="CreatedAt">When the group was created.</param>
    /// <param name="Students">Students of the group in Polish alphabetical order.</param>
    public sealed record GroupDetailResponse(
        Guid Id,
        string Name,
        DateTimeOffset CreatedAt,
        IReadOnlyList<GroupStudentResponse> Students);
}
