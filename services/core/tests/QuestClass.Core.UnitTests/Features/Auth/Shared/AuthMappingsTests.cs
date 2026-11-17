using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Auth.Shared
{
    public sealed class AuthMappingsTests
    {
        [Fact]
        public void ToCurrentUserResponse_ShouldMapToFrontendContract()
        {
            var user = new User
            {
                Login = "student",
                FirstName = "Ewa",
                LastName = "Nowak",
                Role = Role.Student,
                CreatedAt = DateTimeOffset.UtcNow
            };

            var response = user.ToCurrentUserResponse();

            response.ShouldBe(new CurrentUserResponse(user.Id, "student", "Ewa Nowak", "student"));
        }

        [Fact]
        public void ToCurrentUserResponse_WhenLastNameIsEmpty_ShouldNotEndWithSpace()
        {
            var user = new User
            {
                Login = "admin",
                FirstName = "admin",
                LastName = string.Empty,
                Role = Role.Admin,
                CreatedAt = DateTimeOffset.UtcNow
            };

            user.ToCurrentUserResponse().DisplayName.ShouldBe("admin");
        }
    }
}
