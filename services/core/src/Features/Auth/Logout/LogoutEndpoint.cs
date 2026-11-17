using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Features.Auth.Shared.Tokens;

namespace QuestClass.Core.Features.Auth.Logout
{
    [Route("api/core/auth/logout")]
    [Tags("Auth")]
    public sealed class LogoutEndpoint : ApiControllerBase
    {
        /// <summary>
        /// Ends the current session: revokes the refresh token cookie and removes it. Works without an access
        /// token (it may already have expired) and is safe to call more than once.
        /// </summary>
        /// <response code="204">Logged out.</response>
        [HttpPost]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Handle(
            [FromServices] LogoutHandler handler,
            CancellationToken cancellationToken)
        {
            await handler.HandleAsync(RefreshTokenCookie.Read(Request), cancellationToken);

            RefreshTokenCookie.Delete(Response);

            return NoContent();
        }
    }
}
