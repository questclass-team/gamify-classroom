using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Students.Search;
using QuestClass.Core.IntegrationTests.Infrastructure;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Students
{
    public sealed class SearchStudentsEndpointTests : IntegrationTestBase
    {
        public SearchStudentsEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task Search_ShouldReturnMatchingStudentsInTheShapeTheFrontendExpects()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var student = await AddUserAsync("kwojcik", firstName: "Katarzyna", lastName: "Wójcik");

            var response = await SendAsAsync(teacher, HttpMethod.Get, "/api/core/students?query=wojcik");

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await response.Content.ReadFromJsonAsync<List<StudentSummaryResponse>>())
                .ShouldBe([new StudentSummaryResponse(student.Id, "kwojcik", "Katarzyna Wójcik")]);

            // frontend/src/api/types.ts: StudentSummary { id, login, displayName }
            var raw = await (await SendAsAsync(teacher, HttpMethod.Get, "/api/core/students?query=wojcik"))
                .Content.ReadFromJsonAsync<JsonElement>();
            raw[0].EnumerateObject().Select(property => property.Name).ShouldBe(["id", "login", "displayName"]);
        }

        [Fact]
        public async Task Search_ShouldIncludeStudentsAlreadyInAGroup()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var student = await AddUserAsync("kwojcik", firstName: "Katarzyna", lastName: "Wójcik");
            await AddGroupMemberAsync(await AddGroupAsync(teacher), student);

            var response = await SendAsAsync(teacher, HttpMethod.Get, "/api/core/students?query=kwo");

            (await response.Content.ReadFromJsonAsync<List<StudentSummaryResponse>>()).ShouldHaveSingleItem();
        }

        [Fact]
        public async Task Search_ShouldReturnAtMostTenStudents()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            for (var i = 0; i < 12; i++)
            {
                await AddUserAsync($"student{i:D2}", firstName: "Jan", lastName: $"Nowak{i:D2}");
            }

            var response = await SendAsAsync(teacher, HttpMethod.Get, "/api/core/students?query=nowak");

            (await response.Content.ReadFromJsonAsync<List<StudentSummaryResponse>>())!.Count.ShouldBe(10);
        }

        [Theory]
        [InlineData("/api/core/students")]
        [InlineData("/api/core/students?query=")]
        [InlineData("/api/core/students?query=k")]
        public async Task Search_WithQueryShorterThanTwoCharacters_ShouldReturnEmptyList(string url)
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            await AddUserAsync("kwojcik", firstName: "Katarzyna", lastName: "Wójcik");

            var response = await SendAsAsync(teacher, HttpMethod.Get, url);

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await response.Content.ReadFromJsonAsync<List<StudentSummaryResponse>>()).ShouldBeEmpty();
        }

        [Fact]
        public async Task Search_WithTooLongQuery_ShouldReturnValidationProblem()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);

            var response = await SendAsAsync(teacher, HttpMethod.Get, $"/api/core/students?query={new string('a', 101)}");

            await response.ShouldBeProblemAsync(HttpStatusCode.BadRequest);
        }

        [Theory]
        [InlineData(Role.Student)]
        [InlineData(Role.Admin)]
        public async Task Search_WhenCallerIsNotATeacher_ShouldReturnForbiddenProblem(Role role)
        {
            var caller = await AddUserAsync("someone", role);

            var response = await SendAsAsync(caller, HttpMethod.Get, "/api/core/students?query=wojcik");

            await response.ShouldBeProblemAsync(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Search_WithoutToken_ShouldReturnUnauthorizedProblem()
        {
            var response = await Client.GetAsync("/api/core/students?query=wojcik");

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }
    }
}
