namespace QuestClass.Core.Features.Users.Shared
{
    /// <summary>The <c>StudentProfile</c> shape the frontend expects.</summary>
    /// <param name="Nickname">The student's nickname, or null until they set one.</param>
    /// <param name="Avatar">The student's avatar key (one of the ready-made set), or null for none.</param>
    public sealed record ProfileResponse(string? Nickname, string? Avatar);
}
