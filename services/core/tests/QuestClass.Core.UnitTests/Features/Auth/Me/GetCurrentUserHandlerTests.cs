using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Me;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Auth.Me
{
    public sealed class GetCurrentUserHandlerTests
    {
        private readonly IUserRepository _users = Substitute.For<IUserRepository>();
        private readonly GetCurrentUserHandler _handler;

        public GetCurrentUserHandlerTests()
        {
            _handler = new GetCurrentUserHandler(_users, NullLogger<GetCurrentUserHandler>.Instance);
        }

        [Fact]
        public async Task HandleAsync_WhenUserExists_ShouldReturnCurrentUserFromDatabase()
        {
            var user = new User
            {
                Login = "nauczyciel",
                FirstName = "Jan",
                LastName = "Kowalski",
                Role = Role.Teacher,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _users.GetByIdAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);

            var result = await _handler.HandleAsync(user.Id);

            result.IsSuccess.ShouldBeTrue();
            result.Value.ShouldBe(new CurrentUserResponse(user.Id, "nauczyciel", "Jan Kowalski", "teacher"));
        }

        [Fact]
        public async Task HandleAsync_WhenUserNoLongerExists_ShouldReturnUnauthorized()
        {
            var result = await _handler.HandleAsync(Guid.CreateVersion7());

            result.Error.Type.ShouldBe(ErrorType.Unauthorized);
            result.Error.Code.ShouldBe("Auth.SessionUserNotFound");
        }
    }
}
