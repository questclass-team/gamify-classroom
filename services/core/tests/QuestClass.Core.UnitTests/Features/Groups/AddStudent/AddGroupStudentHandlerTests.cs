using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.AddStudent;
using QuestClass.Core.Features.Groups.Shared;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Groups.AddStudent
{
    public sealed class AddGroupStudentHandlerTests
    {
        private readonly IGroupRepository _groups = Substitute.For<IGroupRepository>();
        private readonly IUserRepository _users = Substitute.For<IUserRepository>();
        private readonly FakeTimeProvider _timeProvider = new(new DateTimeOffset(2026, 11, 18, 9, 0, 0, TimeSpan.Zero));
        private readonly AddGroupStudentHandler _handler;
        private readonly Guid _teacherId = Guid.CreateVersion7();
        private readonly Group _group;
        private readonly User _student;

        public AddGroupStudentHandlerTests()
        {
            _handler = new AddGroupStudentHandler(_groups, _users, _timeProvider, NullLogger<AddGroupStudentHandler>.Instance);
            _group = new Group { Name = "Algorytmy", TeacherId = _teacherId, CreatedAt = DateTimeOffset.UtcNow };
            _student = NewUser("kwojcik", Role.Student);

            _groups.GetOwnedAsync(_group.Id, _teacherId, Arg.Any<CancellationToken>()).Returns(_group);
            _users.GetByIdAsync(_student.Id, Arg.Any<CancellationToken>()).Returns(_student);
            _groups.TryAddMemberAsync(default!, default).ReturnsForAnyArgs(true);
        }

        [Fact]
        public async Task HandleAsync_WhenStudentIsNotInGroup_ShouldAddThemNow()
        {
            GroupMember? added = null;
            _groups.TryAddMemberAsync(Arg.Do<GroupMember>(member => added = member), Arg.Any<CancellationToken>())
                .Returns(true);

            var result = await AddAsync(_student.Id);

            added.ShouldNotBeNull();
            (added.GroupId, added.StudentId, added.AddedAt).ShouldBe((_group.Id, _student.Id, _timeProvider.GetUtcNow()));
            result.Value.ShouldBe(new AddGroupStudentResult(
                new GroupStudentResponse(_student.Id, "kwojcik", "Imię Nazwisko", _timeProvider.GetUtcNow()),
                Created: true));
        }

        [Fact]
        public async Task HandleAsync_WhenStudentIsAlreadyInGroup_ShouldReturnExistingMembershipWithoutAdding()
        {
            var joinedEarlier = _timeProvider.GetUtcNow().AddDays(-3);
            _groups.GetMemberAsync(_group.Id, _student.Id, Arg.Any<CancellationToken>())
                .Returns(new GroupMember { GroupId = _group.Id, StudentId = _student.Id, AddedAt = joinedEarlier });

            var result = await AddAsync(_student.Id);

            result.Value.Created.ShouldBeFalse();
            result.Value.Student.AddedAt.ShouldBe(joinedEarlier);
            await _groups.DidNotReceiveWithAnyArgs().TryAddMemberAsync(default!);
        }

        [Fact]
        public async Task HandleAsync_WhenAConcurrentRequestAddedTheStudentFirst_ShouldReturnThatMembership()
        {
            var addedByOtherRequest = _timeProvider.GetUtcNow().AddMilliseconds(-5);
            _groups.TryAddMemberAsync(default!, default).ReturnsForAnyArgs(false);
            _groups.GetMemberAsync(_group.Id, _student.Id, Arg.Any<CancellationToken>())
                .Returns(null, new GroupMember { GroupId = _group.Id, StudentId = _student.Id, AddedAt = addedByOtherRequest });

            var result = await AddAsync(_student.Id);

            result.Value.Created.ShouldBeFalse();
            result.Value.Student.AddedAt.ShouldBe(addedByOtherRequest);
        }

        [Fact]
        public async Task HandleAsync_WhenGroupIsNotTheCallers_ShouldReturnGroupNotFound()
        {
            var result = await _handler.HandleAsync(_group.Id, Guid.CreateVersion7(), new AddGroupStudentRequest(_student.Id));

            result.Error.Code.ShouldBe("Groups.NotFound");
            result.Error.Type.ShouldBe(ErrorType.NotFound);
        }

        [Theory]
        [InlineData(Role.Teacher)]
        [InlineData(Role.Admin)]
        public async Task HandleAsync_WhenAccountIsNotAStudent_ShouldReturnStudentNotFound(Role role)
        {
            var account = NewUser("someone", role);
            _users.GetByIdAsync(account.Id, Arg.Any<CancellationToken>()).Returns(account);

            var result = await AddAsync(account.Id);

            result.Error.Code.ShouldBe("Groups.StudentNotFound");
            await _groups.DidNotReceiveWithAnyArgs().TryAddMemberAsync(default!);
        }

        [Fact]
        public async Task HandleAsync_WhenAccountDoesNotExist_ShouldReturnStudentNotFound()
        {
            var result = await AddAsync(Guid.CreateVersion7());

            result.Error.Code.ShouldBe("Groups.StudentNotFound");
            result.Error.Type.ShouldBe(ErrorType.NotFound);
        }

        private Task<Result<AddGroupStudentResult>> AddAsync(Guid studentId)
        {
            return _handler.HandleAsync(_group.Id, _teacherId, new AddGroupStudentRequest(studentId));
        }

        private static User NewUser(string login, Role role)
        {
            return new User
            {
                Login = login,
                FirstName = "Imię",
                LastName = "Nazwisko",
                Role = role,
                CreatedAt = DateTimeOffset.UtcNow
            };
        }
    }
}
