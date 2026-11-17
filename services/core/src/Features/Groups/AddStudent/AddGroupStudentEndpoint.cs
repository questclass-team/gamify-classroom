using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Authorization;
using QuestClass.Core.Features.Groups.Shared;

namespace QuestClass.Core.Features.Groups.AddStudent
{
    [Route("api/core/groups/{groupId:guid}/students")]
    [Tags("Groups")]
    public sealed class AddGroupStudentEndpoint : ApiControllerBase
    {
        /// <summary>
        /// Adds an imported student to one of the calling teacher's groups (teacher only). Idempotent: a student who is
        /// already in the group is returned unchanged, never added twice. A student can be in many groups.
        /// </summary>
        /// <response code="201">The student was added.</response>
        /// <response code="200">The student was already in the group; nothing changed.</response>
        /// <response code="400">No student id.</response>
        /// <response code="401">No valid access token.</response>
        /// <response code="403">The caller is not a teacher.</response>
        /// <response code="404">The group is not the caller's, or the id is not an existing student account.</response>
        [HttpPost]
        [Authorize(Policy = AuthPolicies.Teacher)]
        [ProducesResponseType(typeof(GroupStudentResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(GroupStudentResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<ActionResult<GroupStudentResponse>> Handle(
            Guid groupId,
            AddGroupStudentRequest request,
            [FromServices] AddGroupStudentHandler handler,
            CancellationToken cancellationToken)
        {
            var teacherId = User.GetUserId();

            if (teacherId is null)
            {
                return HandleFailure(Result.Failure(AuthErrors.SessionUserNotFound()));
            }

            var result = await handler.HandleAsync(groupId, teacherId.Value, request, cancellationToken);

            if (result.IsFailure)
            {
                return HandleFailure(result);
            }

            return result.Value.Created
                ? StatusCode(StatusCodes.Status201Created, result.Value.Student)
                : Ok(result.Value.Student);
        }
    }
}
