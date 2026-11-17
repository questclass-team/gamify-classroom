using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Authorization;

namespace QuestClass.Core.Features.Auth.Me
{
    [Route("api/core/auth/me")]
    [Tags("Auth")]
    public sealed class MeEndpoint : ApiControllerBase
    {
        /// <summary>Returns the user of the access token (any role).</summary>
        /// <response code="200">The current user.</response>
        /// <response code="401">No valid token, or the account no longer exists.</response>
        [HttpGet]
        [ProducesResponseType(typeof(CurrentUserResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<CurrentUserResponse>> Handle(
            [FromServices] GetCurrentUserHandler handler,
            CancellationToken cancellationToken)
        {
            var userId = User.GetUserId();

            if (userId is null)
            {
                return HandleFailure(Result.Failure(AuthErrors.SessionUserNotFound()));
            }

            var result = await handler.HandleAsync(userId.Value, cancellationToken);

            if (result.IsFailure)
            {
                return HandleFailure(result);
            }

            return Ok(result.Value);
        }
    }
}
