using System.Security.Claims;
using QuestClass.Core.Features.Auth.Shared;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Auth.Shared
{
    public sealed class ClaimsPrincipalExtensionsTests
    {
        [Fact]
        public void GetUserId_WhenSubIsGuid_ShouldReturnIt()
        {
            var userId = Guid.CreateVersion7();

            var principal = PrincipalWith(new Claim(AuthClaims.UserId, userId.ToString()));

            principal.GetUserId().ShouldBe(userId);
        }

        [Fact]
        public void GetUserId_WhenSubIsMissing_ShouldReturnNull()
        {
            PrincipalWith().GetUserId().ShouldBeNull();
        }

        [Fact]
        public void GetUserId_WhenSubIsNotGuid_ShouldReturnNull()
        {
            PrincipalWith(new Claim(AuthClaims.UserId, "admin")).GetUserId().ShouldBeNull();
        }

        private static ClaimsPrincipal PrincipalWith(params Claim[] claims)
        {
            return new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));
        }
    }
}
