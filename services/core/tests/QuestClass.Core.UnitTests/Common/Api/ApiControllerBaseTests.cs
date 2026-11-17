using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Results;
using Shouldly;

namespace QuestClass.Core.UnitTests.Common.Api
{
    public sealed class ApiControllerBaseTests
    {
        private readonly TestController _controller = new();

        [Theory]
        [InlineData(ErrorType.Validation, StatusCodes.Status400BadRequest)]
        [InlineData(ErrorType.Unauthorized, StatusCodes.Status401Unauthorized)]
        [InlineData(ErrorType.Forbidden, StatusCodes.Status403Forbidden)]
        [InlineData(ErrorType.NotFound, StatusCodes.Status404NotFound)]
        [InlineData(ErrorType.Conflict, StatusCodes.Status409Conflict)]
        public void HandleFailure_ShouldMapErrorTypeToProblemDetails(ErrorType errorType, int expectedStatusCode)
        {
            var result = Result.Failure(new Error("Test.Code", "Test message.", errorType));

            var response = _controller.Handle(result);

            response.StatusCode.ShouldBe(expectedStatusCode);

            var problemDetails = response.Value.ShouldBeOfType<ProblemDetails>();
            problemDetails.Status.ShouldBe(expectedStatusCode);
            problemDetails.Title.ShouldBe("Test.Code");
            problemDetails.Detail.ShouldBe("Test message.");
        }

        [Fact]
        public void HandleFailure_WhenResultIsSuccessful_ShouldThrow()
        {
            Should.Throw<InvalidOperationException>(() => _controller.Handle(Result.Success()));
        }

        [Fact]
        public void HandleFailure_WhenErrorTypeIsUnknown_ShouldThrow()
        {
            var result = Result.Failure(new Error("Test.Code", "Test message.", (ErrorType)999));

            Should.Throw<ArgumentOutOfRangeException>(() => _controller.Handle(result));
        }

        private sealed class TestController : ApiControllerBase
        {
            public ObjectResult Handle(Result result)
            {
                return HandleFailure(result);
            }
        }
    }
}
