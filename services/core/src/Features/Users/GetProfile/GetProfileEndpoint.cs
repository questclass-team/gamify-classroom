using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Authorization;
using QuestClass.Core.Features.Users.Shared;

namespace QuestClass.Core.Features.Users.GetProfile
{
    [Route("api/core/me/profile")]
    [Tags("Profile")]
    public sealed class GetProfileEndpoint : ApiControllerBase
    {
        /// <summary>The calling student's profile: their nickname, null until they set one (student only).</summary>
        /// <response code="200">The profile.</response>
        /// <response code="401">No valid access token, or the account no longer exists.</response>
        /// <response code="403">The caller is not a student.</response>
        [HttpGet]
        [Authorize(Policy = AuthPolicies.Student)]
        [ProducesResponseType(typeof(ProfileResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<ProfileResponse>> Handle(
            [FromServices] GetProfileHandler handler,
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
