using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Tokens;

namespace QuestClass.Core.Features.Auth.Refresh
{
    [Route("api/core/auth/refresh")]
    [Tags("Auth")]
    public sealed class RefreshEndpoint : ApiControllerBase
    {
        /// <summary>
        /// Exchanges the refresh token cookie (set by login) for a new access token and a new cookie.
        /// No body and no Authorization header: call it when the access token has expired.
        /// </summary>
        /// <response code="200">New access token; the response usually also replaces the refresh cookie.</response>
        /// <response code="401">No valid session (missing, expired, logged out or reused cookie); log in again.</response>
        [HttpPost]
        [AllowAnonymous]
        [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<AuthResponse>> Handle(
            [FromServices] RefreshHandler handler,
            CancellationToken cancellationToken)
        {
            var result = await handler.HandleAsync(RefreshTokenCookie.Read(Request), cancellationToken);

            if (result.IsFailure)
            {
                // The cookie is useless now; removing it stops the browser from sending it again.
                RefreshTokenCookie.Delete(Response);

                return HandleFailure(result);
            }

            if (result.Value.RefreshToken is not null)
            {
                RefreshTokenCookie.Append(Response, result.Value.RefreshToken);
            }

            return Ok(result.Value.Response);
        }
    }
}
