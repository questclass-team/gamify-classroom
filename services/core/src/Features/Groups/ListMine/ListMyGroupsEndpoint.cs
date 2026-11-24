using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Authorization;

namespace QuestClass.Core.Features.Groups.ListMine
{
    [Route("api/core/me/groups")]
    [Tags("Groups")]
    public sealed class ListMyGroupsEndpoint : ApiControllerBase
    {
        /// <summary>
        /// Groups the calling student is a member of, with their teacher, in Polish alphabetical order (student only).
        /// </summary>
        /// <response code="200">The student's groups (empty when there are none).</response>
        /// <response code="401">No valid access token.</response>
        /// <response code="403">The caller is not a student.</response>
        [HttpGet]
        [Authorize(Policy = AuthPolicies.Student)]
        [ProducesResponseType(typeof(IReadOnlyList<MyGroupResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<MyGroupResponse>>> Handle(
            [FromServices] ListMyGroupsHandler handler,
            CancellationToken cancellationToken)
        {
            var studentId = User.GetUserId();

            if (studentId is null)
            {
                return HandleFailure(Result.Failure(AuthErrors.SessionUserNotFound()));
            }

            var result = await handler.HandleAsync(studentId.Value, cancellationToken);

            if (result.IsFailure)
            {
                return HandleFailure(result);
            }

            return Ok(result.Value);
        }
    }
}
