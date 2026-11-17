namespace QuestClass.Core.Features.Auth.Shared
{
    /// <summary>
    /// Claim names inside the access token. They are plain JWT names, the same ones the game service reads;
    /// ASP.NET Core does not rename them because <c>MapInboundClaims</c> is off.
    /// </summary>
    public static class AuthClaims
    {
        /// <summary>User id (Guid).</summary>
        public const string UserId = "sub";

        public const string Login = "login";

        /// <summary>"First Last".</summary>
        public const string Name = "name";

        /// <summary>"student", "teacher" or "admin".</summary>
        public const string Role = "role";

        public const string TokenId = "jti";
    }
}
