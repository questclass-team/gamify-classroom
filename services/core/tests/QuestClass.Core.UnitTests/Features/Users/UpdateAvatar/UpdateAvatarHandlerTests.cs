using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Users.Shared;
using QuestClass.Core.Features.Users.UpdateAvatar;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Users.UpdateAvatar
{
    public sealed class UpdateAvatarHandlerTests
    {
        private readonly IUserRepository _users = Substitute.For<IUserRepository>();
        private readonly UpdateAvatarHandler _handler;

        public UpdateAvatarHandlerTests()
        {
            _handler = new UpdateAvatarHandler(_users, NullLogger<UpdateAvatarHandler>.Instance);
        }

        [Fact]
        public async Task HandleAsync_ShouldSaveOnlyTheAvatarAndReturnTheProfile()
        {
            var student = AddUser(Role.Student, nickname: "Cichy Lis", avatar: null);

            var result = await _handler.HandleAsync(student.Id, new UpdateAvatarRequest("owl"));

            result.Value.ShouldBe(new ProfileResponse("Cichy Lis", "owl"));
            await _users.Received(1).SetAvatarAsync(student.Id, "owl", Arg.Any<CancellationToken>());
            await _users.DidNotReceiveWithAnyArgs().UpdateAsync(default!);
        }

        [Fact]
        public async Task HandleAsync_WithNull_ShouldRemoveTheAvatar()
        {
            var student = AddUser(Role.Student, nickname: null, avatar: "fox");

            var result = await _handler.HandleAsync(student.Id, new UpdateAvatarRequest(null));

            result.Value.Avatar.ShouldBeNull();
            await _users.Received(1).SetAvatarAsync(student.Id, null, Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task HandleAsync_WhenTheAvatarIsAlreadySet_ShouldSaveNothing()
        {
            var student = AddUser(Role.Student, nickname: null, avatar: "fox");

            var result = await _handler.HandleAsync(student.Id, new UpdateAvatarRequest("fox"));

            result.Value.Avatar.ShouldBe("fox");
            await _users.DidNotReceiveWithAnyArgs().SetAvatarAsync(default, default);
        }

        [Fact]
        public async Task HandleAsync_WhenAccountNoLongerExists_ShouldReturnUnauthorized()
        {
            var result = await _handler.HandleAsync(Guid.CreateVersion7(), new UpdateAvatarRequest("fox"));

            result.Error.Type.ShouldBe(ErrorType.Unauthorized);
            result.Error.Code.ShouldBe("Auth.SessionUserNotFound");
        }

        [Theory]
        [InlineData(Role.Teacher)]
        [InlineData(Role.Admin)]
        public async Task HandleAsync_WhenAccountIsNoLongerAStudent_ShouldReturnForbiddenAndSaveNothing(Role role)
        {
            var user = AddUser(role, nickname: null, avatar: null);

            var result = await _handler.HandleAsync(user.Id, new UpdateAvatarRequest("fox"));

            result.Error.Type.ShouldBe(ErrorType.Forbidden);
            result.Error.Code.ShouldBe("Profile.StudentOnly");
            await _users.DidNotReceiveWithAnyArgs().SetAvatarAsync(default, default);
        }

        private User AddUser(Role role, string? nickname, string? avatar)
        {
            var user = new User
            {
                Login = "kwojcik",
                FirstName = "Katarzyna",
                LastName = "Wójcik",
                Nickname = nickname,
                Avatar = avatar,
                Role = role,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _users.GetByIdAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);

            return user;
        }
    }
}
