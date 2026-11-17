using NSubstitute;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.GetById;
using QuestClass.Core.Features.Groups.Shared;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Groups.GetById
{
    public sealed class GetGroupHandlerTests
    {
        private readonly IGroupRepository _groups = Substitute.For<IGroupRepository>();
        private readonly GetGroupHandler _handler;

        public GetGroupHandlerTests()
        {
            _handler = new GetGroupHandler(_groups);
        }

        [Fact]
        public async Task HandleAsync_WhenGroupIsTheTeachers_ShouldReturnItWithItsStudents()
        {
            var teacherId = Guid.CreateVersion7();
            var group = new Group { Name = "Algorytmy", TeacherId = teacherId, CreatedAt = DateTimeOffset.UtcNow };
            var student = new User
            {
                Login = "kwojcik",
                FirstName = "Katarzyna",
                LastName = "Wójcik",
                Role = Role.Student,
                CreatedAt = DateTimeOffset.UtcNow
            };
            var addedAt = new DateTimeOffset(2026, 11, 18, 10, 0, 0, TimeSpan.Zero);
            _groups.GetOwnedAsync(group.Id, teacherId, Arg.Any<CancellationToken>()).Returns(group);
            _groups.GetStudentsAsync(group.Id, Arg.Any<CancellationToken>()).Returns([new GroupStudent(student, addedAt)]);

            var result = await _handler.HandleAsync(group.Id, teacherId);

            result.Value.Id.ShouldBe(group.Id);
            result.Value.Name.ShouldBe("Algorytmy");
            result.Value.CreatedAt.ShouldBe(group.CreatedAt);
            result.Value.Students.ShouldBe([new GroupStudentResponse(student.Id, "kwojcik", "Katarzyna Wójcik", addedAt)]);
        }

        [Fact]
        public async Task HandleAsync_WhenGroupIsMissingOrForeign_ShouldReturnNotFoundWithoutReadingStudents()
        {
            var result = await _handler.HandleAsync(Guid.CreateVersion7(), Guid.CreateVersion7());

            result.Error.Type.ShouldBe(ErrorType.NotFound);
            result.Error.Code.ShouldBe("Groups.NotFound");
            await _groups.DidNotReceiveWithAnyArgs().GetStudentsAsync(default);
        }
    }
}
