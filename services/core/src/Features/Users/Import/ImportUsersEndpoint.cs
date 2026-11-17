using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Auth.Shared.Authorization;

namespace QuestClass.Core.Features.Users.Import
{
    [Route("api/core/admin/users/import")]
    [Tags("Users")]
    public sealed class ImportUsersEndpoint : ApiControllerBase
    {
        /// <summary>
        /// Creates accounts from a CSV file (admin only). Accounts that already exist are skipped, deleted ones are
        /// restored; importing the same file again creates no duplicates. The report lists every created and
        /// skipped row with its line number.
        /// </summary>
        /// <response code="200">Import report (also when every row was skipped).</response>
        /// <response code="400">No file, wrong header, or the file is not UTF-8.</response>
        /// <response code="401">No valid access token.</response>
        /// <response code="403">The caller is not an admin.</response>
        /// <response code="413">The file is larger than 1 MB.</response>
        [HttpPost]
        [Authorize(Policy = AuthPolicies.Admin)]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(UserImportReport), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status413PayloadTooLarge)]
        public async Task<ActionResult<UserImportReport>> Handle(
            [FromForm] ImportUsersRequest request,
            [FromServices] ImportUsersHandler handler,
            CancellationToken cancellationToken)
        {
            // ImportUsersValidator has already rejected a request without a file.
            var file = request.File!;

            if (file.Length > ImportUsersHandler.MaxFileBytes)
            {
                return HandleFailure(Result.Failure(UserImportErrors.FileTooLarge(ImportUsersHandler.MaxFileBytes)));
            }

            await using var content = file.OpenReadStream();
            var result = await handler.HandleAsync(content, cancellationToken);

            if (result.IsFailure)
            {
                return HandleFailure(result);
            }

            return Ok(result.Value);
        }
    }
}
