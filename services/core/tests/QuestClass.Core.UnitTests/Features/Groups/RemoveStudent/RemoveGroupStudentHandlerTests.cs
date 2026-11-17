using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.RemoveStudent;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Groups.RemoveStudent
{
    public sealed class RemoveGroupStudentHandlerTests
    {
        private readonly IGroupRepository _groups = Substitute.For<IGroupRepository>();
        private readonly RemoveGroupStudentHandler _handler;

        public RemoveGroupStudentHandlerTests()
        {
            _handler = new RemoveGroupStudentHandler(_groups, NullLogger<RemoveGroupStudentHandler>.Instance);
        }

        [Fact]
        public async Task HandleAsync_WhenGroupIsTheCallers_ShouldRemoveTheStudent()
        {
            var teacherId = Guid.CreateVersion7();
            var group = new Group { Name = "Algorytmy", TeacherId = teacherId, CreatedAt = DateTimeOffset.UtcNow };
            var studentId = Guid.CreateVersion7();
            _groups.GetOwnedAsync(group.Id, teacherId, Arg.Any<CancellationToken>()).Returns(group);

            var result = await _handler.HandleAsync(group.Id, teacherId, studentId);

            result.IsSuccess.ShouldBeTrue();
            await _groups.Received(1).RemoveMemberAsync(group.Id, studentId, Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task HandleAsync_WhenGroupIsNotTheCallers_ShouldReturnNotFoundAndRemoveNothing()
        {
            var result = await _handler.HandleAsync(Guid.CreateVersion7(), Guid.CreateVersion7(), Guid.CreateVersion7());

            result.Error.Code.ShouldBe("Groups.NotFound");
            await _groups.DidNotReceiveWithAnyArgs().RemoveMemberAsync(default, default);
        }
    }
}
