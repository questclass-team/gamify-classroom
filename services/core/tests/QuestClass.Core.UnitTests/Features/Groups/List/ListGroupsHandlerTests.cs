using NSubstitute;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.List;
using QuestClass.Core.Features.Groups.Shared;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Groups.List
{
    public sealed class ListGroupsHandlerTests
    {
        private readonly IGroupRepository _groups = Substitute.For<IGroupRepository>();
        private readonly ListGroupsHandler _handler;

        public ListGroupsHandlerTests()
        {
            _handler = new ListGroupsHandler(_groups);
        }

        [Fact]
        public async Task HandleAsync_ShouldReturnTheTeachersGroupsInRepositoryOrderWithStudentCounts()
        {
            var teacherId = Guid.CreateVersion7();
            var algorithms = NewGroup("Algorytmy", teacherId);
            var databases = NewGroup("Bazy danych", teacherId);
            _groups.GetByTeacherAsync(teacherId, Arg.Any<CancellationToken>())
                .Returns([new GroupWithStudentCount(algorithms, 12), new GroupWithStudentCount(databases, 0)]);

            var result = await _handler.HandleAsync(teacherId);

            result.Value.ShouldBe([
                new GroupSummaryResponse(algorithms.Id, "Algorytmy", 12, algorithms.CreatedAt),
                new GroupSummaryResponse(databases.Id, "Bazy danych", 0, databases.CreatedAt)
            ]);
        }

        [Fact]
        public async Task HandleAsync_WhenTeacherHasNoGroups_ShouldReturnEmptyList()
        {
            var result = await _handler.HandleAsync(Guid.CreateVersion7());

            result.Value.ShouldBeEmpty();
        }

        private static Group NewGroup(string name, Guid teacherId)
        {
            return new Group { Name = name, TeacherId = teacherId, CreatedAt = DateTimeOffset.UtcNow };
        }
    }
}
