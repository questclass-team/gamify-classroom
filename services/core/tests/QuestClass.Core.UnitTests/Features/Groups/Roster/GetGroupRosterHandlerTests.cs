using NSubstitute;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.Roster;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Groups.Roster
{
    public sealed class GetGroupRosterHandlerTests
    {
        private readonly IGroupRepository _groups = Substitute.For<IGroupRepository>();
        private readonly GetGroupRosterHandler _handler;
        private readonly Guid _teacherId = Guid.CreateVersion7();
        private readonly Group _group;
        private readonly RosterEntry[] _roster =
            [new(Guid.CreateVersion7(), "Cichy Lis", "fox"), new(Guid.CreateVersion7(), null, null)];

        public GetGroupRosterHandlerTests()
        {
            _handler = new GetGroupRosterHandler(_groups);
            _group = new Group { Name = "Algorytmy", TeacherId = _teacherId, CreatedAt = DateTimeOffset.UtcNow };
            _groups.GetRosterAsync(_group.Id, Arg.Any<CancellationToken>()).Returns(_roster);
        }

        [Fact]
        public async Task HandleAsync_WhenTeacherOwnsTheGroup_ShouldReturnTheRoster()
        {
            _groups.GetOwnedAsync(_group.Id, _teacherId, Arg.Any<CancellationToken>()).Returns(_group);

            var result = await _handler.HandleAsync(_group.Id, _teacherId, Role.Teacher);

            result.Value.ShouldBe([
                new RosterEntryResponse(_roster[0].StudentId, "Cichy Lis", "fox"),
                new RosterEntryResponse(_roster[1].StudentId, null, null)
            ]);
            await _groups.DidNotReceiveWithAnyArgs().GetForMemberAsync(default, default);
        }

        [Fact]
        public async Task HandleAsync_WhenStudentIsAMember_ShouldReturnTheRoster()
        {
            var studentId = _roster[0].StudentId;
            _groups.GetForMemberAsync(_group.Id, studentId, Arg.Any<CancellationToken>()).Returns(_group);

            var result = await _handler.HandleAsync(_group.Id, studentId, Role.Student);

            result.Value.Count.ShouldBe(2);
            await _groups.DidNotReceiveWithAnyArgs().GetOwnedAsync(default, default);
        }

        [Theory]
        [InlineData(Role.Teacher)]
        [InlineData(Role.Student)]
        [InlineData(Role.Admin)]
        public async Task HandleAsync_WhenCallerMayNotSeeTheGroup_ShouldReturnNotFoundWithoutReadingTheRoster(Role role)
        {
            var result = await _handler.HandleAsync(_group.Id, Guid.CreateVersion7(), role);

            result.Error.Type.ShouldBe(ErrorType.NotFound);
            result.Error.Code.ShouldBe("Groups.NotFound");
            await _groups.DidNotReceiveWithAnyArgs().GetRosterAsync(default);
        }
    }
}
