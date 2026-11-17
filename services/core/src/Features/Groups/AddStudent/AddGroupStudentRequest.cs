namespace QuestClass.Core.Features.Groups.AddStudent
{
    /// <param name="StudentId">Id of an imported student account (from <c>GET /api/core/students</c>).</param>
    public sealed record AddGroupStudentRequest(Guid StudentId);
}
