using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.Shared;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Groups.AddStudent
{
    /// <summary>
    /// Adds an imported student to one of the calling teacher's groups (FR-07). Adding a student who is already in
    /// the group changes nothing and returns the existing membership, so a repeated click never duplicates it.
    /// </summary>
    public sealed class AddGroupStudentHandler
    {
        private readonly IGroupRepository _groupRepository;
        private readonly IUserRepository _userRepository;
        private readonly TimeProvider _timeProvider;
        private readonly ILogger<AddGroupStudentHandler> _logger;

        public AddGroupStudentHandler(
            IGroupRepository groupRepository,
            IUserRepository userRepository,
            TimeProvider timeProvider,
            ILogger<AddGroupStudentHandler> logger)
        {
            _groupRepository = groupRepository;
            _userRepository = userRepository;
            _timeProvider = timeProvider;
            _logger = logger;
        }

        public async Task<Result<AddGroupStudentResult>> HandleAsync(
            Guid groupId,
            Guid teacherId,
            AddGroupStudentRequest request,
            CancellationToken cancellationToken = default)
        {
            var group = await _groupRepository.GetOwnedAsync(groupId, teacherId, cancellationToken);

            if (group is null)
            {
                return Result<AddGroupStudentResult>.Failure(GroupErrors.NotFound());
            }

            var student = await _userRepository.GetByIdAsync(request.StudentId, cancellationToken);

            if (student is null || student.Role != Role.Student)
            {
                return Result<AddGroupStudentResult>.Failure(GroupErrors.StudentNotFound());
            }

            var existing = await _groupRepository.GetMemberAsync(group.Id, student.Id, cancellationToken);

            if (existing is not null)
            {
                return Result<AddGroupStudentResult>.Success(ToResult(student, existing, created: false));
            }

            var member = new GroupMember
            {
                GroupId = group.Id,
                StudentId = student.Id,
                AddedAt = _timeProvider.GetUtcNow()
            };

            if (!await _groupRepository.TryAddMemberAsync(member, cancellationToken))
            {
                // A concurrent request added the student first: answer with that membership.
                existing = await _groupRepository.GetMemberAsync(group.Id, student.Id, cancellationToken);

                return Result<AddGroupStudentResult>.Success(ToResult(student, existing ?? member, created: false));
            }

            _logger.LogInformation(
                "Student added to group. GroupId: {GroupId}, StudentId: {StudentId}",
                group.Id,
                student.Id);

            return Result<AddGroupStudentResult>.Success(ToResult(student, member, created: true));
        }

        private static AddGroupStudentResult ToResult(User student, GroupMember member, bool created)
        {
            return new AddGroupStudentResult(new GroupStudent(student, member.AddedAt).ToGroupStudentResponse(), created);
        }
    }

    /// <param name="Student">The student as a group member.</param>
    /// <param name="Created">False when the student was already in the group.</param>
    public sealed record AddGroupStudentResult(GroupStudentResponse Student, bool Created);
}
