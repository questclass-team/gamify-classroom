using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Authorization;

namespace QuestClass.Core.Features.Groups.GetById
{
    // An id that is not a Guid matches no route and gets 404, like a missing group (never 400).
    [Route("api/core/groups/{groupId:guid}")]
    [Tags("Groups")]
    public sealed class GetGroupEndpoint : ApiControllerBase
    {
        /// <summary>
        /// One of the calling teacher's groups with its students (teacher only). The game service calls it with the
        /// user's token to check that a group is the caller's.
        /// </summary>
        /// <response code="200">The group and its students.</response>
        /// <response code="401">No valid access token.</response>
        /// <response code="403">The caller is not a teacher.</response>
        /// <response code="404">The group does not exist or belongs to another teacher.</response>
        [HttpGet]
        [Authorize(Policy = AuthPolicies.Teacher)]
        [ProducesResponseType(typeof(GroupDetailResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<GroupDetailResponse>> Handle(
            Guid groupId,
            [FromServices] GetGroupHandler handler,
            CancellationToken cancellationToken)
        {
            var teacherId = User.GetUserId();

            if (teacherId is null)
            {
                return HandleFailure(Result.Failure(AuthErrors.SessionUserNotFound()));
            }

            var result = await handler.HandleAsync(groupId, teacherId.Value, cancellationToken);

            if (result.IsFailure)
            {
                return HandleFailure(result);
            }

            return Ok(result.Value);
        }
    }
}
