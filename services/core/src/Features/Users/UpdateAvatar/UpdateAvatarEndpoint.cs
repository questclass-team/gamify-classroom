using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Authorization;
using QuestClass.Core.Features.Users.Shared;

namespace QuestClass.Core.Features.Users.UpdateAvatar
{
    [Route("api/core/me/avatar")]
    [Tags("Profile")]
    public sealed class UpdateAvatarEndpoint : ApiControllerBase
    {
        /// <summary>
        /// Sets the calling student's avatar to one of the ready-made ones, or removes it with null (student only).
        /// Shown next to the nickname, for example in rankings.
        /// </summary>
        /// <response code="200">The saved profile with the avatar.</response>
        /// <response code="400">The key is not one of the ready-made avatars (<c>errors.Avatar</c>).</response>
        /// <response code="401">No valid access token, or the account no longer exists.</response>
        /// <response code="403">The caller is not a student.</response>
        [HttpPut]
        [Authorize(Policy = AuthPolicies.Student)]
        [ProducesResponseType(typeof(ProfileResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ProfileResponse>> Handle(
            UpdateAvatarRequest request,
            [FromServices] UpdateAvatarHandler handler,
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
