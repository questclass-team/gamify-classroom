using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Authorization;
using QuestClass.Core.Features.Users.Shared;

namespace QuestClass.Core.Features.Users.UpdateProfile
{
    [Route("api/core/me/profile")]
    [Tags("Profile")]
    public sealed class UpdateProfileEndpoint : ApiControllerBase
    {
        /// <summary>
        /// Sets the calling student's nickname, the only name other students see in rankings (student only).
        /// </summary>
        /// <response code="200">The saved profile; the nickname as stored (trimmed).</response>
        /// <response code="400">The nickname is missing or breaks the rules (<c>errors.Nickname</c>).</response>
        /// <response code="401">No valid access token, or the account no longer exists.</response>
        /// <response code="403">The caller is not a student.</response>
        /// <response code="409">Another account already has this nickname, in any letter case.</response>
        [HttpPut]
        [Authorize(Policy = AuthPolicies.Student)]
        [ProducesResponseType(typeof(ProfileResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
        public async Task<ActionResult<ProfileResponse>> Handle(
            UpdateProfileRequest request,
            [FromServices] UpdateProfileHandler handler,
            CancellationToken cancellationToken)
        {
            var studentId = User.GetUserId();

            if (studentId is null)
            {
                return HandleFailure(Result.Failure(AuthErrors.SessionUserNotFound()));
            }

            var result = await handler.HandleAsync(studentId.Value, request, cancellationToken);

            if (result.IsFailure)
            {
                return HandleFailure(result);
            }

            return Ok(result.Value);
        }
    }
}
