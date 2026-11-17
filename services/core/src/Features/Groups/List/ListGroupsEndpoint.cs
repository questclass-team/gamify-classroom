using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Authorization;
using QuestClass.Core.Features.Groups.Shared;

namespace QuestClass.Core.Features.Groups.List
{
    [Route("api/core/groups")]
    [Tags("Groups")]
    public sealed class ListGroupsEndpoint : ApiControllerBase
    {
        /// <summary>
        /// Groups of the calling teacher with their number of students, in Polish alphabetical order (teacher only).
        /// </summary>
        /// <response code="200">The teacher's groups (empty when there are none).</response>
        /// <response code="401">No valid access token.</response>
        /// <response code="403">The caller is not a teacher.</response>
        [HttpGet]
        [Authorize(Policy = AuthPolicies.Teacher)]
        [ProducesResponseType(typeof(IReadOnlyList<GroupSummaryResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<GroupSummaryResponse>>> Handle(
            [FromServices] ListGroupsHandler handler,
            CancellationToken cancellationToken)
        {
            var teacherId = User.GetUserId();

            if (teacherId is null)
            {
                return HandleFailure(Result.Failure(AuthErrors.SessionUserNotFound()));
            }

            var result = await handler.HandleAsync(teacherId.Value, cancellationToken);

            if (result.IsFailure)
            {
                return HandleFailure(result);
            }

            return Ok(result.Value);
        }
    }
}
