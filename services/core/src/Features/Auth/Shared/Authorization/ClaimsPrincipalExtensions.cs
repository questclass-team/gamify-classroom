using System.Security.Claims;

namespace QuestClass.Core.Features.Auth.Shared.Authorization
{
    public static class ClaimsPrincipalExtensions
    {
        /// <summary>User id from the access token ("sub"), or null when it is missing or not a Guid.</summary>
        public static Guid? GetUserId(this ClaimsPrincipal principal)
        {
            var value = principal.FindFirstValue(AuthClaims.UserId);

            return Guid.TryParse(value, out var userId)
                ? userId
                : null;
        }
    }
}
