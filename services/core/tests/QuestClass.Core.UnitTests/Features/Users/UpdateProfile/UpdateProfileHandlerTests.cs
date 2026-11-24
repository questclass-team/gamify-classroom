using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Users.UpdateProfile;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Users.UpdateProfile
{
    public sealed class UpdateProfileHandlerTests
    {
        private readonly IUserRepository _users = Substitute.For<IUserRepository>();
        private readonly UpdateProfileHandler _handler;

        public UpdateProfileHandlerTests()
        {
            _handler = new UpdateProfileHandler(_users, NullLogger<UpdateProfileHandler>.Instance);
        }

        [Fact]
        public async Task HandleAsync_WhenNicknameIsFree_ShouldSaveItTrimmedAndReturnIt()
        {
            var student = AddUser(Role.Student);
            _users.TrySetNicknameAsync(student, Arg.Any<string>(), Arg.Any<CancellationToken>())
                .Returns(call =>
                {
                    student.Nickname = call.ArgAt<string>(1);
                    return true;
                });

            var result = await _handler.HandleAsync(student.Id, new UpdateProfileRequest("  Cichy Lis "));

            result.Value.Nickname.ShouldBe("Cichy Lis");
            await _users.Received(1).TrySetNicknameAsync(student, "Cichy Lis", Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task HandleAsync_WhenNicknameIsTaken_ShouldReturnConflict()
        {
            var student = AddUser(Role.Student);
            _users.TrySetNicknameAsync(student, "Cichy Lis", Arg.Any<CancellationToken>()).Returns(false);

            var result = await _handler.HandleAsync(student.Id, new UpdateProfileRequest("Cichy Lis"));

            result.Error.Type.ShouldBe(ErrorType.Conflict);
            result.Error.Code.ShouldBe("Profile.NicknameTaken");
        }

        [Fact]
        public async Task HandleAsync_WhenNicknameIsUnchanged_ShouldNotSaveAgain()
        {
            var student = AddUser(Role.Student, nickname: "Cichy Lis");

            var result = await _handler.HandleAsync(student.Id, new UpdateProfileRequest(" Cichy Lis "));

            result.Value.Nickname.ShouldBe("Cichy Lis");
            await _users.DidNotReceiveWithAnyArgs().TrySetNicknameAsync(default!, default!);
        }

        [Fact]
        public async Task HandleAsync_WhenOnlyLetterCaseChanges_ShouldSaveIt()
        {
            var student = AddUser(Role.Student, nickname: "cichy lis");
            _users.TrySetNicknameAsync(student, "Cichy Lis", Arg.Any<CancellationToken>()).Returns(true);

            var result = await _handler.HandleAsync(student.Id, new UpdateProfileRequest("Cichy Lis"));

            result.IsSuccess.ShouldBeTrue();
            await _users.Received(1).TrySetNicknameAsync(student, "Cichy Lis", Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task HandleAsync_WhenAccountNoLongerExists_ShouldReturnUnauthorized()
        {
            var result = await _handler.HandleAsync(Guid.CreateVersion7(), new UpdateProfileRequest("Cichy Lis"));

            result.Error.Code.ShouldBe("Auth.SessionUserNotFound");
            await _users.DidNotReceiveWithAnyArgs().TrySetNicknameAsync(default!, default!);
        }

        [Theory]
        [InlineData(Role.Teacher)]
        [InlineData(Role.Admin)]
        public async Task HandleAsync_WhenAccountIsNoLongerAStudent_ShouldReturnForbidden(Role role)
        {
            var user = AddUser(role);

            var result = await _handler.HandleAsync(user.Id, new UpdateProfileRequest("Cichy Lis"));

            result.Error.Type.ShouldBe(ErrorType.Forbidden);
            result.Error.Code.ShouldBe("Profile.StudentOnly");
            await _users.DidNotReceiveWithAnyArgs().TrySetNicknameAsync(default!, default!);
        }

        private User AddUser(Role role, string? nickname = null)
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
