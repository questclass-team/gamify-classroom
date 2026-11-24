using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.ListMine;
using QuestClass.Core.IntegrationTests.Infrastructure;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Groups
{
    public sealed class ListMyGroupsEndpointTests : IntegrationTestBase
    {
        private const string MyGroupsUrl = "/api/core/me/groups";

        public ListMyGroupsEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task List_ShouldReturnOnlyTheStudentsGroupsInPolishOrderWithTeacherAndJoinTime()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher, "Jan", "Kowalski");
            var otherTeacher = await AddUserAsync("mwisniewski", Role.Teacher, "Maria", "Wiśniewska");
            var student = await AddUserAsync("kwojcik");
            var zajecia = await AddGroupAsync(teacher, "Zajęcia");
            var cwiczenia = await AddGroupAsync(otherTeacher, "Ćwiczenia");
            var algorytmy = await AddGroupAsync(teacher, "algorytmy");
            await AddGroupAsync(teacher, "Nie moja grupa");
            var joinedAt = new DateTimeOffset(2026, 11, 18, 10, 15, 0, TimeSpan.Zero);
            await AddGroupMemberAsync(zajecia, student, joinedAt);
            await AddGroupMemberAsync(cwiczenia, student, joinedAt.AddDays(1));
            await AddGroupMemberAsync(algorytmy, student, joinedAt.AddDays(2));

            var response = await SendAsAsync(student, HttpMethod.Get, MyGroupsUrl);

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await response.Content.ReadFromJsonAsync<List<MyGroupResponse>>()).ShouldBe([
                new MyGroupResponse(algorytmy.Id, "algorytmy", "Jan Kowalski", joinedAt.AddDays(2)),
                new MyGroupResponse(cwiczenia.Id, "Ćwiczenia", "Maria Wiśniewska", joinedAt.AddDays(1)),
                new MyGroupResponse(zajecia.Id, "Zajęcia", "Jan Kowalski", joinedAt)
            ]);
        }

        [Fact]
        public async Task List_ShouldReturnTheShapeTheFrontendExpects()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher, "Jan", "Kowalski");
            var student = await AddUserAsync("kwojcik");
            var group = await AddGroupAsync(teacher, "Algorytmy");
            await AddGroupMemberAsync(group, student);

            var response = await SendAsAsync(student, HttpMethod.Get, MyGroupsUrl);

            // frontend/src/api/types.ts: MyGroup { id, name, teacherName, joinedAt }
            var item = (await response.Content.ReadFromJsonAsync<JsonElement>())[0];
            item.EnumerateObject().Select(property => property.Name)
                .ShouldBe(["id", "name", "teacherName", "joinedAt"]);
            item.GetProperty("id").GetGuid().ShouldBe(group.Id);
        }

        [Fact]
        public async Task List_ShouldLeaveOutDeletedGroupsButKeepGroupsOfADeletedTeacher()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher, "Jan", "Kowalski");
            var deletedTeacher = await AddUserAsync("mwisniewski", Role.Teacher, "Maria", "Wiśniewska");
            var student = await AddUserAsync("kwojcik");
            var deletedGroup = await AddGroupAsync(teacher, "Usunięta");
            var orphanedGroup = await AddGroupAsync(deletedTeacher, "Bez nauczyciela");
            await AddGroupMemberAsync(deletedGroup, student);
            await AddGroupMemberAsync(orphanedGroup, student);
            await SoftDeleteAsync(deletedGroup);
            await SoftDeleteAsync(deletedTeacher);

            var response = await SendAsAsync(student, HttpMethod.Get, MyGroupsUrl);

            var group = (await response.Content.ReadFromJsonAsync<List<MyGroupResponse>>()).ShouldHaveSingleItem();
            group.Id.ShouldBe(orphanedGroup.Id);
            group.TeacherName.ShouldBe("Maria Wiśniewska");
        }

        [Fact]
        public async Task List_WhenStudentIsInNoGroup_ShouldReturnEmptyArray()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher);
            var student = await AddUserAsync("kwojcik");
            var classmate = await AddUserAsync("anowak");
            await AddGroupMemberAsync(await AddGroupAsync(teacher), classmate);

            var response = await SendAsAsync(student, HttpMethod.Get, MyGroupsUrl);

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await response.Content.ReadAsStringAsync()).ShouldBe("[]");
        }

        [Theory]
        [InlineData(Role.Teacher)]
        [InlineData(Role.Admin)]
        public async Task List_WhenCallerIsNotAStudent_ShouldReturnForbiddenProblem(Role role)
        {
            var caller = await AddUserAsync("someone", role);

            var response = await SendAsAsync(caller, HttpMethod.Get, MyGroupsUrl);

            await response.ShouldBeProblemAsync(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task List_WithoutToken_ShouldReturnUnauthorizedProblem()
        {
            var response = await Client.GetAsync(MyGroupsUrl);

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }
    }
}
