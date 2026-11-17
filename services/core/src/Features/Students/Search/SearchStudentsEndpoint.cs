using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Features.Auth.Shared.Authorization;

namespace QuestClass.Core.Features.Students.Search
{
    [Route("api/core/students")]
    [Tags("Students")]
    public sealed class SearchStudentsEndpoint : ApiControllerBase
    {
        /// <summary>
        /// Student accounts whose login or name contains the query, ignoring letter case and Polish diacritics
        /// ("wojcik" finds "Wójcik"), in alphabetical order, at most 10 (teacher only). A query shorter than 2
        /// characters returns an empty list. Students already in a group are included.
        /// </summary>
        /// <response code="200">Matching students (empty when none match).</response>
        /// <response code="400">The query is longer than 100 characters.</response>
        /// <response code="401">No valid access token.</response>
        /// <response code="403">The caller is not a teacher.</response>
        [HttpGet]
        [Authorize(Policy = AuthPolicies.Teacher)]
        [ProducesResponseType(typeof(IReadOnlyList<StudentSummaryResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<ActionResult<IReadOnlyList<StudentSummaryResponse>>> Handle(
            [FromQuery] SearchStudentsRequest request,
            [FromServices] SearchStudentsHandler handler,
            CancellationToken cancellationToken)
        {
            var result = await handler.HandleAsync(request.Query, cancellationToken);

            if (result.IsFailure)
            {
                return HandleFailure(result);
            }

            return Ok(result.Value);
        }
    }
}
