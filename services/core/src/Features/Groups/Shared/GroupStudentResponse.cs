namespace QuestClass.Core.Features.Groups.Shared
{
    /// <summary>The <c>GroupStudent</c> shape the frontend expects: a student in a group.</summary>
    /// <param name="Id">The student's user id.</param>
    /// <param name="Login">Faculty LDAP login, lower-case.</param>
    /// <param name="DisplayName">"First Last".</param>
    /// <param name="AddedAt">When the student was added to the group.</param>
    public sealed record GroupStudentResponse(Guid Id, string Login, string DisplayName, DateTimeOffset AddedAt);
}
