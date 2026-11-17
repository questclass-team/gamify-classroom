using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Groups.Shared;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Groups.List
{
    /// <summary>The calling teacher's groups; groups of other teachers are never listed.</summary>
    public sealed class ListGroupsHandler
    {
        private readonly IGroupRepository _groupRepository;

        public ListGroupsHandler(IGroupRepository groupRepository)
        {
            _groupRepository = groupRepository;
        }

        public async Task<Result<IReadOnlyList<GroupSummaryResponse>>> HandleAsync(
            Guid teacherId,
            CancellationToken cancellationToken = default)
        {
            var groups = await _groupRepository.GetByTeacherAsync(teacherId, cancellationToken);

            return Result<IReadOnlyList<GroupSummaryResponse>>.Success(groups
                .Select(item => item.Group.ToGroupSummaryResponse(item.StudentCount))
                .ToList());
        }
    }
}
