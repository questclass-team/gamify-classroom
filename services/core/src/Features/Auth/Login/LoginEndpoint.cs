using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuestClass.Core.Common.Api;

namespace QuestClass.Core.Features.Auth.Login
{
    [Route("api/core/auth/login")]
    [Tags("Auth")]
    public sealed class LoginEndpoint : ApiControllerBase
    {
        /// <summary>Logs in with a faculty LDAP account and returns an access token.</summary>
        /// <response code="200">Logged in.</response>
        /// <response code="400">Login or password is missing or malformed.</response>
        /// <response code="401">Wrong login or password.</response>
        /// <response code="403">Valid faculty account that was not imported into QuestClass.</response>
        /// <response code="429">Too many login attempts from this address; try again in a minute.</response>
        [HttpPost]
        [AllowAnonymous]
        [EnableRateLimiting(RateLimitPolicies.Login)]
        [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(HttpValidationProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
        public async Task<ActionResult<LoginResponse>> Handle(
            [FromBody] LoginRequest request,
            [FromServices] LoginHandler handler,
            CancellationToken cancellationToken)
        {
            var result = await handler.HandleAsync(request, cancellationToken);

            if (result.IsFailure)
            {
                return HandleFailure(result);
            }

            return Ok(result.Value);
        }
    }
}
