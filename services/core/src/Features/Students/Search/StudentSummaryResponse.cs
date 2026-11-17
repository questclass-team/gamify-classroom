namespace QuestClass.Core.Features.Students.Search
{
    /// <summary>The <c>StudentSummary</c> shape the frontend expects: an imported student account.</summary>
    /// <param name="Id">User id; send it as <c>studentId</c> to add the student to a group.</param>
    /// <param name="Login">Faculty LDAP login, lower-case.</param>
    /// <param name="DisplayName">"First Last".</param>
    public sealed record StudentSummaryResponse(Guid Id, string Login, string DisplayName);
}
