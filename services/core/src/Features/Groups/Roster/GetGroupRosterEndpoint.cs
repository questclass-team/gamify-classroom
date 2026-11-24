using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Authorization;

namespace QuestClass.Core.Features.Groups.Roster
{
    // An id that is not a Guid matches no route and gets 404, like a missing group (never 400).
    [Route("api/core/groups/{groupId:guid}/roster")]
    [Tags("Groups")]
    public sealed class GetGroupRosterEndpoint : ApiControllerBase
    {
        /// <summary>
        /// Current members of a group with their nicknames only, no names or logins (the group's teacher or a student
        /// in the group). The game service calls it with the user's token for membership checks and rankings.
        /// </summary>
        /// <response code="200">The members (empty when the group has none).</response>
        /// <response code="401">No valid access token.</response>
        /// <response code="403">The caller is neither a teacher nor a student.</response>
        /// <response code="404">
        /// The group does not exist or is deleted, or the caller is neither its teacher nor a student in it.
        /// </response>
        [HttpGet]
        [Authorize(Policy = AuthPolicies.TeacherOrStudent)]
        [ProducesResponseType(typeof(IReadOnlyList<RosterEntryResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<IReadOnlyList<RosterEntryResponse>>> Handle(
            Guid groupId,
            [FromServices] GetGroupRosterHandler handler,
            CancellationToken cancellationToken)
        {
            var callerId = User.GetUserId();

            if (callerId is null)
            {
                return HandleFailure(Result.Failure(AuthErrors.SessionUserNotFound()));
            }

            // The policy lets in only these two roles.
            var callerRole = User.IsInRole(Role.Teacher.ToApiName())
                ? Role.Teacher
                : Role.Student;

            var result = await handler.HandleAsync(groupId, callerId.Value, callerRole, cancellationToken);

            if (result.IsFailure)
            {
                return HandleFailure(result);
            }

            return Ok(result.Value);
        }
    }
}
