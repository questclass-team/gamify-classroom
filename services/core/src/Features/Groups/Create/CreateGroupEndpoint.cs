using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Authorization;
using QuestClass.Core.Features.Groups.Shared;

namespace QuestClass.Core.Features.Groups.Create
{
    [Route("api/core/groups")]
    [Tags("Groups")]
    public sealed class CreateGroupEndpoint : ApiControllerBase
    {
        /// <summary>Creates an empty group owned by the calling teacher (teacher only).</summary>
        /// <response code="201">The created group; <c>Location</c> points to it.</response>
        /// <response code="400">The name is empty or longer than 100 characters after trimming.</response>
        /// <response code="401">No valid access token.</response>
        /// <response code="403">The caller is not a teacher.</response>
        [HttpPost]
        [Authorize(Policy = AuthPolicies.Teacher)]
        [ProducesResponseType(typeof(GroupSummaryResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<GroupSummaryResponse>> Handle(
            CreateGroupRequest request,
            [FromServices] CreateGroupHandler handler,
            CancellationToken cancellationToken)
        {
            var teacherId = User.GetUserId();

            if (teacherId is null)
            {
                return HandleFailure(Result.Failure(AuthErrors.SessionUserNotFound()));
            }

            var result = await handler.HandleAsync(teacherId.Value, request, cancellationToken);

            if (result.IsFailure)
            {
                return HandleFailure(result);
            }

            return Created($"/api/core/groups/{result.Value.Id}", result.Value);
        }
    }
}
