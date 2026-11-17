using System.Net;
using System.Net.Http.Json;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.GetById;
using QuestClass.Core.Features.Groups.Shared;
using QuestClass.Core.IntegrationTests.Infrastructure;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Groups
{
    public sealed class GetGroupEndpointTests : IntegrationTestBase
    {
        public GetGroupEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task Get_OwnGroup_ShouldReturnItWithItsStudents()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher, "Algorytmy");
            var zajac = await AddUserAsync("azajac", firstName: "Anna", lastName: "Zając");
            var cwik = await AddUserAsync("acwik", firstName: "Anna", lastName: "Ćwik");
            var addedAt = new DateTimeOffset(2026, 11, 18, 10, 15, 0, TimeSpan.Zero);
            await AddGroupMemberAsync(group, zajac, addedAt);
            await AddGroupMemberAsync(group, cwik, addedAt.AddMinutes(1));

            var response = await SendAsAsync(teacher, HttpMethod.Get, GroupUrl(group.Id));

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            var body = (await response.Content.ReadFromJsonAsync<GroupDetailResponse>())!;
            body.Id.ShouldBe(group.Id);
            body.Name.ShouldBe("Algorytmy");
            body.Students.ShouldBe([
                new GroupStudentResponse(cwik.Id, "acwik", "Anna Ćwik", addedAt.AddMinutes(1)),
                new GroupStudentResponse(zajac.Id, "azajac", "Anna Zając", addedAt)
            ]);
        }

        [Fact]
        public async Task Get_GroupWithoutStudents_ShouldReturnEmptyStudentList()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);

            var response = await SendAsAsync(teacher, HttpMethod.Get, GroupUrl(group.Id));

            (await response.Content.ReadFromJsonAsync<GroupDetailResponse>())!.Students.ShouldBeEmpty();
        }

        [Fact]
        public async Task Get_AnotherTeachersGroup_ShouldReturnNotFoundProblem()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var otherTeacher = await AddUserAsync("mwisniewski", Role.Teacher);
            var foreignGroup = await AddGroupAsync(otherTeacher);

            var response = await SendAsAsync(teacher, HttpMethod.Get, GroupUrl(foreignGroup.Id));

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.NotFound);
            problem.Title().ShouldBe("Groups.NotFound");
        }

        [Fact]
        public async Task Get_DeletedGroup_ShouldReturnNotFoundProblem()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            await SoftDeleteAsync(group);

            var response = await SendAsAsync(teacher, HttpMethod.Get, GroupUrl(group.Id));

            (await response.ShouldBeProblemAsync(HttpStatusCode.NotFound)).Title().ShouldBe("Groups.NotFound");
        }

        [Theory]
        [InlineData("0196f2a4-0000-7000-8000-000000000000")]
        [InlineData("not-a-guid")]
        public async Task Get_UnknownOrMalformedId_ShouldReturnNotFoundProblem(string groupId)
        {
            // The game service treats 404 as "not your group" but anything like 400 as core being broken.
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);

            var response = await SendAsAsync(teacher, HttpMethod.Get, $"/api/core/groups/{groupId}");

            await response.ShouldBeProblemAsync(HttpStatusCode.NotFound);
        }

        [Theory]
        [InlineData(Role.Student)]
        [InlineData(Role.Admin)]
        public async Task Get_WhenCallerIsNotATeacher_ShouldReturnForbiddenProblem(Role role)
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var caller = await AddUserAsync("someone", role);

            var response = await SendAsAsync(caller, HttpMethod.Get, GroupUrl(group.Id));

            await response.ShouldBeProblemAsync(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Get_WithoutToken_ShouldReturnUnauthorizedProblem()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);

            var response = await Client.GetAsync(GroupUrl(group.Id));

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }

        private static string GroupUrl(Guid groupId)
        {
            return $"/api/core/groups/{groupId}";
        }
    }
}
