using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.Shared;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Groups.Create
{
    /// <summary>Creates an empty group owned by the calling teacher (FR-06).</summary>
    public sealed class CreateGroupHandler
    {
        private readonly IGroupRepository _groupRepository;
        private readonly TimeProvider _timeProvider;
        private readonly ILogger<CreateGroupHandler> _logger;

        public CreateGroupHandler(
            IGroupRepository groupRepository,
            TimeProvider timeProvider,
            ILogger<CreateGroupHandler> logger)
        {
            _groupRepository = groupRepository;
            _timeProvider = timeProvider;
            _logger = logger;
        }

        public async Task<Result<GroupSummaryResponse>> HandleAsync(
            Guid teacherId,
            CreateGroupRequest request,
            CancellationToken cancellationToken = default)
        {
            var group = new Group
            {
                Name = request.Name.Trim(),
                TeacherId = teacherId,
                CreatedAt = _timeProvider.GetUtcNow()
            };

            await _groupRepository.AddAsync(group, cancellationToken);

            _logger.LogInformation("Group created. GroupId: {GroupId}, TeacherId: {TeacherId}", group.Id, teacherId);

            return Result<GroupSummaryResponse>.Success(group.ToGroupSummaryResponse(studentCount: 0));
        }
    }
}
