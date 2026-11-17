using System.Net;
using System.Text.Json;
using QuestClass.Core.IntegrationTests.Infrastructure;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Common
{
    public sealed class ServiceEndpointsTests : IntegrationTestBase
    {
        public ServiceEndpointsTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task LivenessCheck_ShouldReturnHealthy()
        {
            var response = await Client.GetAsync("/health/live");

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await response.Content.ReadAsStringAsync()).ShouldBe("Healthy");
        }

        [Fact]
        public async Task ReadinessCheck_WhenDatabaseIsReachable_ShouldReturnHealthy()
        {
            var response = await Client.GetAsync("/health/ready");

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await response.Content.ReadAsStringAsync()).ShouldBe("Healthy");
        }

        [Fact]
        public async Task OpenApiDocument_ShouldBeServedUnderCorePrefix()
        {
            var response = await Client.GetAsync("/api/core/swagger/v1/swagger.json");

            response.StatusCode.ShouldBe(HttpStatusCode.OK);

            using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
            document.RootElement.GetProperty("info").GetProperty("title").GetString()
                .ShouldBe("QuestClass Core API");
        }

        [Fact]
        public async Task SwaggerUi_ShouldBeServedUnderCorePrefix()
        {
            var response = await Client.GetAsync("/api/core/swagger/index.html");

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
        }
    }
}
