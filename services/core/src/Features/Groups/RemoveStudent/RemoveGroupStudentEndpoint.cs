using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Authorization;

namespace QuestClass.Core.Features.Groups.RemoveStudent
{
    [Route("api/core/groups/{groupId:guid}/students/{studentId:guid}")]
    [Tags("Groups")]
    public sealed class RemoveGroupStudentEndpoint : ApiControllerBase
    {
        /// <summary>
        /// Removes a student from one of the calling teacher's groups (teacher only). Also succeeds when the student
        /// is not in the group. The student's account and other groups are not changed.
        /// </summary>
        /// <response code="204">The student is no longer in the group.</response>
        /// <response code="401">No valid access token.</response>
        /// <response code="403">The caller is not a teacher.</response>
        /// <response code="404">The group does not exist or belongs to another teacher.</response>
        [HttpDelete]
        [Authorize(Policy = AuthPolicies.Teacher)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Handle(
            Guid groupId,
            Guid studentId,
            [FromServices] RemoveGroupStudentHandler handler,
            CancellationToken cancellationToken)
        {
            var teacherId = User.GetUserId();

            if (teacherId is null)
            {
                return HandleFailure(Result.Failure(AuthErrors.SessionUserNotFound()));
            }

            var result = await handler.HandleAsync(groupId, teacherId.Value, studentId, cancellationToken);

            if (result.IsFailure)
            {
                return HandleFailure(result);
            }

            return NoContent();
        }
    }
}
