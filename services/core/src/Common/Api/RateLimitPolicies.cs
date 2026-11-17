namespace QuestClass.Core.Common.Api
{
    /// <summary>Use as <c>[EnableRateLimiting(RateLimitPolicies.Login)]</c> on an endpoint.</summary>
    public static class RateLimitPolicies
    {
        public const string Login = "Login";
    }
}
