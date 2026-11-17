using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.Shared;
using QuestClass.Core.IntegrationTests.Infrastructure;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Groups
{
    public sealed class CreateGroupEndpointTests : IntegrationTestBase
    {
        private const string GroupsUrl = "/api/core/groups";

        public CreateGroupEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task Create_ShouldReturnCreatedGroupAndSaveItForTheTeacher()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);

            var response = await SendAsAsync(teacher, HttpMethod.Post, GroupsUrl, new { name = "  Algorytmy – grupa 1 " });

            response.StatusCode.ShouldBe(HttpStatusCode.Created);
            var body = (await response.Content.ReadFromJsonAsync<GroupSummaryResponse>())!;
            body.Name.ShouldBe("Algorytmy – grupa 1");
            body.StudentCount.ShouldBe(0);
            response.Headers.Location!.ToString().ShouldBe($"/api/core/groups/{body.Id}");

            using var scope = CreateScope();
            var saved = await scope.ServiceProvider.GetRequiredService<IGroupRepository>().GetOwnedAsync(body.Id, teacher.Id);
            saved.ShouldNotBeNull().Name.ShouldBe("Algorytmy – grupa 1");
        }

        [Fact]
        public async Task Create_WithSameNameTwice_ShouldCreateTwoGroups()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);

            var first = await SendAsAsync(teacher, HttpMethod.Post, GroupsUrl, new { name = "Bazy danych" });
            var second = await SendAsAsync(teacher, HttpMethod.Post, GroupsUrl, new { name = "Bazy danych" });

            first.StatusCode.ShouldBe(HttpStatusCode.Created);
            second.StatusCode.ShouldBe(HttpStatusCode.Created);
            first.Headers.Location.ShouldNotBe(second.Headers.Location);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public async Task Create_WithBlankName_ShouldReturnValidationProblem(string name)
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);

            var response = await SendAsAsync(teacher, HttpMethod.Post, GroupsUrl, new { name });

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.BadRequest);
            problem.GetProperty("errors").GetProperty("Name")[0].GetString().ShouldBe("Group name is required.");
        }

        [Fact]
        public async Task Create_WithoutNameField_ShouldReturnValidationProblem()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);

            var response = await SendAsAsync(teacher, HttpMethod.Post, GroupsUrl, new { });

            await response.ShouldBeProblemAsync(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Create_WithTooLongName_ShouldReturnValidationProblem()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);

            var response = await SendAsAsync(teacher, HttpMethod.Post, GroupsUrl, new { name = new string('a', 101) });

            await response.ShouldBeProblemAsync(HttpStatusCode.BadRequest);
        }

        [Theory]
        [InlineData(Role.Student)]
        [InlineData(Role.Admin)]
        public async Task Create_WhenCallerIsNotATeacher_ShouldReturnForbiddenProblem(Role role)
        {
            var caller = await AddUserAsync("someone", role);

            var response = await SendAsAsync(caller, HttpMethod.Post, GroupsUrl, new { name = "Grupa" });

            await response.ShouldBeProblemAsync(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Create_WithoutToken_ShouldReturnUnauthorizedProblem()
        {
            var response = await Client.PostAsJsonAsync(GroupsUrl, new { name = "Grupa" });

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }
    }
}
