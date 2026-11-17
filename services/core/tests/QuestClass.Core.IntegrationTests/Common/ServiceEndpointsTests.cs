using System.Net;
using System.Text.Json;
using QuestClass.Core.IntegrationTests.Infrastructure;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Common
{
    public sealed class ServiceEndpointsTests : IClassFixture<CoreApiFactory>
    {
        private readonly HttpClient _client;

        public ServiceEndpointsTests(CoreApiFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task LivenessCheck_ShouldReturnHealthy()
        {
            var response = await _client.GetAsync("/health/live");

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await response.Content.ReadAsStringAsync()).ShouldBe("Healthy");
        }

        [Fact]
        public async Task OpenApiDocument_ShouldBeServedUnderCorePrefix()
        {
            var response = await _client.GetAsync("/api/core/swagger/v1/swagger.json");

            response.StatusCode.ShouldBe(HttpStatusCode.OK);

            using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
            document.RootElement.GetProperty("info").GetProperty("title").GetString()
                .ShouldBe("QuestClass Core API");
        }

        [Fact]
        public async Task SwaggerUi_ShouldBeServedUnderCorePrefix()
        {
            var response = await _client.GetAsync("/api/core/swagger/index.html");

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
        }
    }
}
