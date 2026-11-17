using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.Create;
using QuestClass.Core.Features.Groups.Shared;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Groups.Create
{
    public sealed class CreateGroupHandlerTests
    {
        private readonly IGroupRepository _groups = Substitute.For<IGroupRepository>();
        private readonly FakeTimeProvider _timeProvider = new(new DateTimeOffset(2026, 11, 18, 9, 0, 0, TimeSpan.Zero));
        private readonly CreateGroupHandler _handler;

        public CreateGroupHandlerTests()
        {
            _handler = new CreateGroupHandler(_groups, _timeProvider, NullLogger<CreateGroupHandler>.Instance);
        }

        [Fact]
        public async Task HandleAsync_ShouldSaveTrimmedGroupOwnedByTheTeacher()
        {
            var teacherId = Guid.CreateVersion7();
            Group? saved = null;
            await _groups.AddAsync(Arg.Do<Group>(group => saved = group), Arg.Any<CancellationToken>());

            var result = await _handler.HandleAsync(teacherId, new CreateGroupRequest("  Bazy danych – grupa 2 "));

            saved.ShouldNotBeNull();
            saved.Name.ShouldBe("Bazy danych – grupa 2");
            saved.TeacherId.ShouldBe(teacherId);
            saved.CreatedAt.ShouldBe(_timeProvider.GetUtcNow());
            result.Value.ShouldBe(new GroupSummaryResponse(saved.Id, "Bazy danych – grupa 2", 0, _timeProvider.GetUtcNow()));
        }
    }
}
