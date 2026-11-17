using System.Net;
using System.Text.Json;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Infrastructure
{
    public static class ProblemDetailsAssertions
    {
        /// <summary>
        /// Checks the status and that the body is RFC 9457 problem details (<c>application/problem+json</c>),
        /// then returns the body. Use it in every negative test: the content type is part of the contract.
        /// </summary>
        public static async Task<JsonElement> ShouldBeProblemAsync(
            this HttpResponseMessage response,
            HttpStatusCode expectedStatus)
        {
            response.StatusCode.ShouldBe(expectedStatus);
            response.Content.Headers.ContentType?.MediaType.ShouldBe("application/problem+json");

            using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
            var problem = document.RootElement.Clone();

            problem.GetProperty("status").GetInt32().ShouldBe((int)expectedStatus);

            return problem;
        }

        public static string Title(this JsonElement problem)
        {
            return problem.GetProperty("title").GetString()!;
        }
    }
}
