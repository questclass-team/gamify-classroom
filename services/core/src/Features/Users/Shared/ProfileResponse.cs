namespace QuestClass.Core.Features.Users.Shared
{
    /// <summary>The <c>StudentProfile</c> shape the frontend expects.</summary>
    /// <param name="Nickname">The student's nickname, or null until they set one.</param>
    public sealed record ProfileResponse(string? Nickname);
}
