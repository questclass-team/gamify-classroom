using NSubstitute;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Users.GetProfile;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Users.GetProfile
{
    public sealed class GetProfileHandlerTests
    {
        private readonly IUserRepository _users = Substitute.For<IUserRepository>();
        private readonly GetProfileHandler _handler;

        public GetProfileHandlerTests()
        {
            _handler = new GetProfileHandler(_users);
        }

        [Theory]
        [InlineData("Cichy Lis")]
        [InlineData(null)]
        public async Task HandleAsync_WhenCallerIsAStudent_ShouldReturnTheNickname(string? nickname)
        {
            var student = AddUser(Role.Student, nickname);

            var result = await _handler.HandleAsync(student.Id);

            result.Value.Nickname.ShouldBe(nickname);
        }

        [Fact]
        public async Task HandleAsync_WhenAccountNoLongerExists_ShouldReturnUnauthorized()
        {
            var result = await _handler.HandleAsync(Guid.CreateVersion7());

            result.Error.Type.ShouldBe(ErrorType.Unauthorized);
            result.Error.Code.ShouldBe("Auth.SessionUserNotFound");
        }

        [Theory]
        [InlineData(Role.Teacher)]
        [InlineData(Role.Admin)]
        public async Task HandleAsync_WhenAccountIsNoLongerAStudent_ShouldReturnForbidden(Role role)
        {
            var user = AddUser(role, nickname: null);

            var result = await _handler.HandleAsync(user.Id);

            result.Error.Type.ShouldBe(ErrorType.Forbidden);
            result.Error.Code.ShouldBe("Profile.StudentOnly");
        }

        private User AddUser(Role role, string? nickname)
        {
            var user = new User
            {
                Login = "kwojcik",
                FirstName = "Katarzyna",
                LastName = "Wójcik",
                Nickname = nickname,
                Role = role,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _users.GetByIdAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);

            return user;
        }
    }
}
