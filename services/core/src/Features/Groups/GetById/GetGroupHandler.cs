using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Groups.Shared;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Groups.GetById
{
    /// <summary>One of the calling teacher's groups with its students.</summary>
    public sealed class GetGroupHandler
    {
        private readonly IGroupRepository _groupRepository;

        public GetGroupHandler(IGroupRepository groupRepository)
        {
            _groupRepository = groupRepository;
        }

        public async Task<Result<GroupDetailResponse>> HandleAsync(
            Guid groupId,
            Guid teacherId,
            CancellationToken cancellationToken = default)
        {
            var group = await _groupRepository.GetOwnedAsync(groupId, teacherId, cancellationToken);

            if (group is null)
            {
                return Result<GroupDetailResponse>.Failure(GroupErrors.NotFound());
            }

            var students = await _groupRepository.GetStudentsAsync(group.Id, cancellationToken);

            return Result<GroupDetailResponse>.Success(new GroupDetailResponse(
                group.Id,
                group.Name,
                group.CreatedAt,
                students.Select(student => student.ToGroupStudentResponse()).ToList()));
        }
    }
}
