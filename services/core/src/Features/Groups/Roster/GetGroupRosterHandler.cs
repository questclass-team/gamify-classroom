using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.Shared;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Groups.Roster
{
    /// <summary>
    /// The members of a group by nickname, for its teacher and its own students (rankings in the game service, NFR-02,
    /// NFR-03).
    /// </summary>
    public sealed class GetGroupRosterHandler
    {
        private readonly IGroupRepository _groupRepository;

        public GetGroupRosterHandler(IGroupRepository groupRepository)
        {
            _groupRepository = groupRepository;
        }

        /// <param name="groupId">The group.</param>
        /// <param name="callerId">The calling user.</param>
        /// <param name="callerRole">Teacher or student; any other role sees no group.</param>
        /// <param name="cancellationToken">Cancels the database queries.</param>
        public async Task<Result<IReadOnlyList<RosterEntryResponse>>> HandleAsync(
            Guid groupId,
            Guid callerId,
            Role callerRole,
            CancellationToken cancellationToken = default)
        {
            var group = callerRole switch
            {
                Role.Teacher => await _groupRepository.GetOwnedAsync(groupId, callerId, cancellationToken),
                Role.Student => await _groupRepository.GetForMemberAsync(groupId, callerId, cancellationToken),
                _ => null
            };

            if (group is null)
            {
                return Result<IReadOnlyList<RosterEntryResponse>>.Failure(GroupErrors.RosterNotFound());
            }

            var roster = await _groupRepository.GetRosterAsync(group.Id, cancellationToken);

            return Result<IReadOnlyList<RosterEntryResponse>>.Success(roster
                .Select(entry => new RosterEntryResponse(entry.StudentId, entry.Nickname, entry.Avatar))
                .ToList());
        }
    }
}
