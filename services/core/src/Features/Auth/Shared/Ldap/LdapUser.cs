namespace QuestClass.Core.Features.Auth.Shared.Ldap
{
    /// <summary>Names as stored in the directory; null when the entry has no such attribute.</summary>
    public sealed record LdapUser(string? FirstName, string? LastName);
}
