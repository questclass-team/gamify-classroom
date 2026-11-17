using QuestClass.Core.Common.Results;
using Shouldly;

namespace QuestClass.Core.UnitTests.Common.Results
{
    public sealed class ResultTests
    {
        private static readonly Error _testError = Error.NotFound("Test.NotFound", "Not found.");

        [Fact]
        public void Success_ShouldBeSuccessfulWithoutError()
        {
            var result = Result.Success();

            result.IsSuccess.ShouldBeTrue();
            result.IsFailure.ShouldBeFalse();
            result.Error.ShouldBe(Error.None);
        }

        [Fact]
        public void Failure_ShouldBeFailedWithGivenError()
        {
            var result = Result.Failure(_testError);

            result.IsFailure.ShouldBeTrue();
            result.Error.ShouldBe(_testError);
        }

        [Fact]
        public void Failure_WhenErrorIsNone_ShouldThrow()
        {
            Should.Throw<ArgumentException>(() => Result.Failure(Error.None));
        }

        [Fact]
        public void GenericSuccess_ShouldExposeValue()
        {
            var result = Result<int>.Success(42);

            result.IsSuccess.ShouldBeTrue();
            result.Value.ShouldBe(42);
        }

        [Fact]
        public void GenericFailure_WhenValueIsRead_ShouldThrow()
        {
            var result = Result<int>.Failure(_testError);

            result.IsFailure.ShouldBeTrue();
            Should.Throw<InvalidOperationException>(() => result.Value);
        }
    }
}
