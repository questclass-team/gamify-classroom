using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.Shared;
using QuestClass.Core.IntegrationTests.Infrastructure;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Groups
{
    public sealed class ListGroupsEndpointTests : IntegrationTestBase
    {
        private const string GroupsUrl = "/api/core/groups";

        public ListGroupsEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task List_ShouldReturnOnlyTheCallersGroupsInPolishOrderWithStudentCounts()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var otherTeacher = await AddUserAsync("mwisniewski", Role.Teacher);
            var zajecia = await AddGroupAsync(teacher, "Zajęcia");
            var cwiczenia = await AddGroupAsync(teacher, "Ćwiczenia");
            await AddGroupAsync(otherTeacher, "Analiza");
            await AddGroupMemberAsync(cwiczenia, await AddUserAsync("student"));
            await AddGroupMemberAsync(cwiczenia, await AddUserAsync("kwojcik"));

            var response = await SendAsAsync(teacher, HttpMethod.Get, GroupsUrl);

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            var groups = (await response.Content.ReadFromJsonAsync<List<GroupSummaryResponse>>())!;
            groups.Select(group => (group.Id, group.Name, group.StudentCount))
                .ShouldBe([(cwiczenia.Id, "Ćwiczenia", 2), (zajecia.Id, "Zajęcia", 0)]);
        }

        [Fact]
        public async Task List_WhenTeacherHasNoGroups_ShouldReturnEmptyArray()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);

            var response = await SendAsAsync(teacher, HttpMethod.Get, GroupsUrl);

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await response.Content.ReadFromJsonAsync<List<GroupSummaryResponse>>()).ShouldBeEmpty();
        }

        [Fact]
        public async Task List_ShouldReturnTheShapeTheFrontendExpects()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher, "Algorytmy");

            var response = await SendAsAsync(teacher, HttpMethod.Get, GroupsUrl);

            // frontend/src/api/types.ts: GroupSummary { id, name, studentCount, createdAt }
            var item = (await response.Content.ReadFromJsonAsync<JsonElement>())[0];
            item.EnumerateObject().Select(property => property.Name)
                .ShouldBe(["id", "name", "studentCount", "createdAt"]);
            item.GetProperty("id").GetGuid().ShouldBe(group.Id);
        }

        [Theory]
        [InlineData(Role.Student)]
        [InlineData(Role.Admin)]
        public async Task List_WhenCallerIsNotATeacher_ShouldReturnForbiddenProblem(Role role)
        {
            var caller = await AddUserAsync("someone", role);

            var response = await SendAsAsync(caller, HttpMethod.Get, GroupsUrl);

            await response.ShouldBeProblemAsync(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task List_WithoutToken_ShouldReturnUnauthorizedProblem()
        {
            var response = await Client.GetAsync(GroupsUrl);

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }
    }
}
