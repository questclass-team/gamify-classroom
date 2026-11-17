namespace QuestClass.Core.Features.Auth.Shared.Authorization
{
    /// <summary>Use as <c>[Authorize(Policy = AuthPolicies.Admin)]</c> on an endpoint.</summary>
    public static class AuthPolicies
    {
        public const string Admin = "Admin";

        public const string Teacher = "Teacher";

        public const string Student = "Student";
    }
}
