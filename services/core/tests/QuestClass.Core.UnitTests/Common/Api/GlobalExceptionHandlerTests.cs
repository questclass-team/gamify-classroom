using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NSubstitute;
using QuestClass.Core.Common.Api;
using Shouldly;

namespace QuestClass.Core.UnitTests.Common.Api
{
    public sealed class GlobalExceptionHandlerTests : IDisposable
    {
        private readonly ServiceProvider _services;
        private readonly GlobalExceptionHandler _handler;

        public GlobalExceptionHandlerTests()
        {
            _services = new ServiceCollection()
                .AddLogging()
                .AddProblemDetails()
                .BuildServiceProvider();

            _handler = new GlobalExceptionHandler(
                _services.GetRequiredService<IProblemDetailsService>(),
                Substitute.For<ILogger<GlobalExceptionHandler>>());
        }

        [Fact]
        public async Task TryHandleAsync_WhenExceptionOccurs_ShouldWriteServerErrorProblemDetails()
        {
            var httpContext = CreateHttpContext();

            var handled = await _handler.TryHandleAsync(
                httpContext,
                new InvalidOperationException("Sensitive internal details"),
                CancellationToken.None);

            handled.ShouldBeTrue();
            httpContext.Response.StatusCode.ShouldBe(StatusCodes.Status500InternalServerError);
            httpContext.Response.ContentType.ShouldBe("application/problem+json");

            using var body = await ReadBodyAsync(httpContext);
            body.RootElement.GetProperty("status").GetInt32().ShouldBe(500);
            body.RootElement.GetProperty("title").GetString().ShouldBe("Server Error");
            body.RootElement.GetRawText().ShouldNotContain("Sensitive internal details");
        }

        [Fact]
        public async Task TryHandleAsync_WhenClientCanceledRequest_ShouldReturnClientClosedRequestWithoutBody()
        {
            using var cancellation = new CancellationTokenSource();
            var httpContext = CreateHttpContext();
            httpContext.RequestAborted = cancellation.Token;
            await cancellation.CancelAsync();

            var handled = await _handler.TryHandleAsync(
                httpContext,
                new OperationCanceledException(),
                CancellationToken.None);

            handled.ShouldBeTrue();
            httpContext.Response.StatusCode.ShouldBe(StatusCodes.Status499ClientClosedRequest);
            httpContext.Response.Body.Length.ShouldBe(0);
        }

        public void Dispose()
        {
            _services.Dispose();
        }

        private DefaultHttpContext CreateHttpContext()
        {
            return new DefaultHttpContext
            {
                RequestServices = _services,
                Response = { Body = new MemoryStream() },
                Request = { Method = HttpMethods.Get, Path = "/api/core/test" }
            };
        }

        private static async Task<JsonDocument> ReadBodyAsync(HttpContext httpContext)
        {
            httpContext.Response.Body.Position = 0;
            return await JsonDocument.ParseAsync(httpContext.Response.Body);
        }
    }
}
