using NSubstitute;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.ListMine;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Groups.ListMine
{
    public sealed class ListMyGroupsHandlerTests
    {
        private readonly IGroupRepository _groups = Substitute.For<IGroupRepository>();
        private readonly ListMyGroupsHandler _handler;

        public ListMyGroupsHandlerTests()
        {
            _handler = new ListMyGroupsHandler(_groups);
        }

        [Fact]
        public async Task HandleAsync_ShouldReturnTheStudentsGroupsWithTeacherNameInRepositoryOrder()
        {
            var studentId = Guid.CreateVersion7();
            var teacher = new User
            {
                Login = "jkowalski",
                FirstName = "Jan",
                LastName = "Kowalski",
                Role = Role.Teacher,
                CreatedAt = DateTimeOffset.UtcNow
            };
            var algorithms = new Group { Name = "Algorytmy", TeacherId = teacher.Id, CreatedAt = DateTimeOffset.UtcNow };
            var databases = new Group { Name = "Bazy danych", TeacherId = teacher.Id, CreatedAt = DateTimeOffset.UtcNow };
            var joinedAt = new DateTimeOffset(2026, 11, 18, 10, 0, 0, TimeSpan.Zero);
            _groups.GetByStudentAsync(studentId, Arg.Any<CancellationToken>()).Returns([
                new StudentGroup(algorithms, teacher, joinedAt),
                new StudentGroup(databases, teacher, joinedAt.AddDays(1))
            ]);

            var result = await _handler.HandleAsync(studentId);

            result.Value.ShouldBe([
                new MyGroupResponse(algorithms.Id, "Algorytmy", "Jan Kowalski", joinedAt),
                new MyGroupResponse(databases.Id, "Bazy danych", "Jan Kowalski", joinedAt.AddDays(1))
            ]);
        }

        [Fact]
        public async Task HandleAsync_WhenStudentIsInNoGroup_ShouldReturnEmptyList()
        {
            _groups.GetByStudentAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns([]);

            var result = await _handler.HandleAsync(Guid.CreateVersion7());

            result.Value.ShouldBeEmpty();
        }
    }
}
