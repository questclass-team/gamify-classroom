using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Results;

namespace QuestClass.Core.Common.Api
{
    [ApiController]
    public abstract class ApiControllerBase : ControllerBase
    {
        protected ObjectResult HandleFailure(Result result)
        {
            if (result.IsSuccess)
            {
                throw new InvalidOperationException(
                    "Cannot handle a successful result as a failure.");
            }

            return Problem(
                statusCode: ToStatusCode(result.Error.Type),
                title: result.Error.Code,
                detail: result.Error.Message);
        }

        private static int ToStatusCode(ErrorType errorType)
        {
            return errorType switch
            {
                ErrorType.Validation => StatusCodes.Status400BadRequest,
                ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
                ErrorType.Forbidden => StatusCodes.Status403Forbidden,
                ErrorType.NotFound => StatusCodes.Status404NotFound,
                ErrorType.Conflict => StatusCodes.Status409Conflict,
                ErrorType.TooLarge => StatusCodes.Status413PayloadTooLarge,
                _ => throw new ArgumentOutOfRangeException(
                    nameof(errorType),
                    errorType,
                    "Error type cannot be mapped to an HTTP status code.")
            };
        }
    }
}
