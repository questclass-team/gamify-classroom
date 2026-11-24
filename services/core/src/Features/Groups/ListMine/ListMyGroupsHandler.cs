using QuestClass.Core.Common.Results;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Groups.ListMine
{
    /// <summary>The groups the calling student is a member of (student views); other groups are never listed.</summary>
    public sealed class ListMyGroupsHandler
    {
        private readonly IGroupRepository _groupRepository;

        public ListMyGroupsHandler(IGroupRepository groupRepository)
        {
            _groupRepository = groupRepository;
        }

        public async Task<Result<IReadOnlyList<MyGroupResponse>>> HandleAsync(
            Guid studentId,
            CancellationToken cancellationToken = default)
        {
            var groups = await _groupRepository.GetByStudentAsync(studentId, cancellationToken);

            return Result<IReadOnlyList<MyGroupResponse>>.Success(groups
                .Select(item => new MyGroupResponse(
                    item.Group.Id,
                    item.Group.Name,
                    item.Teacher.DisplayName,
                    item.JoinedAt))
                .ToList());
        }
    }
}
