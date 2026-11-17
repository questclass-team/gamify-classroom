using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Groups.Shared;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Groups.RemoveStudent
{
    /// <summary>
    /// Removes a student from one of the calling teacher's groups (FR-07). Removing a student who is not in the group
    /// succeeds too, so a repeated click is harmless. The student's account and other groups are not touched.
    /// </summary>
    public sealed class RemoveGroupStudentHandler
    {
        private readonly IGroupRepository _groupRepository;
        private readonly ILogger<RemoveGroupStudentHandler> _logger;

        public RemoveGroupStudentHandler(IGroupRepository groupRepository, ILogger<RemoveGroupStudentHandler> logger)
        {
            _groupRepository = groupRepository;
            _logger = logger;
        }

        public async Task<Result> HandleAsync(
            Guid groupId,
            Guid teacherId,
            Guid studentId,
            CancellationToken cancellationToken = default)
        {
            var group = await _groupRepository.GetOwnedAsync(groupId, teacherId, cancellationToken);

            if (group is null)
            {
                return Result.Failure(GroupErrors.NotFound());
            }

            await _groupRepository.RemoveMemberAsync(group.Id, studentId, cancellationToken);

            _logger.LogInformation(
                "Student removed from group. GroupId: {GroupId}, StudentId: {StudentId}",
                group.Id,
                studentId);

            return Result.Success();
        }
    }
}
