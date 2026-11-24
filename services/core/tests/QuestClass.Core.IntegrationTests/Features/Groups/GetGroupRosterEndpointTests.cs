using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.Roster;
using QuestClass.Core.IntegrationTests.Infrastructure;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Groups
{
    public sealed class GetGroupRosterEndpointTests : IntegrationTestBase
    {
        public GetGroupRosterEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task Get_AsOwningTeacher_ShouldReturnMembersByNicknameWithoutNicknameLast()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var lis = await AddUserAsync("kwojcik", nickname: "cichy Lis", avatar: "fox");
            var orzel = await AddUserAsync("anowak", nickname: "Dzielny Orzeł");
            var anonymous = await AddUserAsync("pzielinski");
            var outsider = await AddUserAsync("mlis", nickname: "Obcy");
            await AddGroupMemberAsync(group, lis);
            await AddGroupMemberAsync(group, orzel);
            await AddGroupMemberAsync(group, anonymous);
            await AddGroupMemberAsync(await AddGroupAsync(teacher, "Inna grupa"), outsider);

            var response = await SendAsAsync(teacher, HttpMethod.Get, RosterUrl(group.Id));

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await response.Content.ReadFromJsonAsync<List<RosterEntryResponse>>()).ShouldBe([
                // Letter case is ignored: byte order would put "Dzielny" before "cichy".
                new RosterEntryResponse(lis.Id, "cichy Lis", "fox"),
                new RosterEntryResponse(orzel.Id, "Dzielny Orzeł", null),
                new RosterEntryResponse(anonymous.Id, null, null)
            ]);
        }

        [Fact]
        public async Task Get_AsMemberStudent_ShouldReturnOnlyIdsAndNicknamesNeverNamesOrLogins()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var student = await AddUserAsync("kwojcik", firstName: "Katarzyna", lastName: "Wójcik", nickname: "Cichy Lis");
            var classmate = await AddUserAsync("anowak", firstName: "Anna", lastName: "Nowak");
            await AddGroupMemberAsync(group, student);
            await AddGroupMemberAsync(group, classmate);

            var response = await SendAsAsync(student, HttpMethod.Get, RosterUrl(group.Id));

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            var body = await response.Content.ReadAsStringAsync();
            foreach (var personalData in new[] { "kwojcik", "anowak", "Katarzyna", "Wójcik", "Anna", "Nowak" })
            {
                body.ShouldNotContain(personalData);
            }

            // Game service contract: [{ studentId, nickname | null, avatar | null }]
            var items = JsonSerializer.Deserialize<JsonElement>(body).EnumerateArray().ToList();
            items.Count.ShouldBe(2);
            items.ShouldAllBe(item => item.EnumerateObject().Select(property => property.Name)
                .SequenceEqual(new[] { "studentId", "nickname", "avatar" }));
            items[0].GetProperty("studentId").GetGuid().ShouldBe(student.Id);
            items[1].GetProperty("nickname").ValueKind.ShouldBe(JsonValueKind.Null);
        }

        [Fact]
        public async Task Get_ShouldLeaveOutDeletedStudentAccounts()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var student = await AddUserAsync("kwojcik", nickname: "Cichy Lis");
            var deletedStudent = await AddUserAsync("anowak", nickname: "Usunięty");
            await AddGroupMemberAsync(group, student);
            await AddGroupMemberAsync(group, deletedStudent);
            await SoftDeleteAsync(deletedStudent);

            var response = await SendAsAsync(teacher, HttpMethod.Get, RosterUrl(group.Id));

            (await response.Content.ReadFromJsonAsync<List<RosterEntryResponse>>()).ShouldBe([
                new RosterEntryResponse(student.Id, "Cichy Lis", null)
            ]);
        }

        [Fact]
        public async Task Get_GroupWithoutMembers_ShouldReturnEmptyArray()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher);
            var group = await AddGroupAsync(teacher);

            var response = await SendAsAsync(teacher, HttpMethod.Get, RosterUrl(group.Id));

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await response.Content.ReadAsStringAsync()).ShouldBe("[]");
        }

        [Fact]
        public async Task Get_AsStudentOutsideTheGroup_ShouldReturnNotFoundProblem()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            await AddGroupMemberAsync(group, await AddUserAsync("anowak"));
            var outsider = await AddUserAsync("kwojcik");
            await AddGroupMemberAsync(await AddGroupAsync(teacher, "Inna grupa"), outsider);

            var response = await SendAsAsync(outsider, HttpMethod.Get, RosterUrl(group.Id));

            (await response.ShouldBeProblemAsync(HttpStatusCode.NotFound)).Title().ShouldBe("Groups.NotFound");
        }

        [Fact]
        public async Task Get_AsForeignTeacher_ShouldReturnNotFoundProblem()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher);
            var otherTeacher = await AddUserAsync("mwisniewski", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            await AddGroupMemberAsync(group, await AddUserAsync("kwojcik"));

            var response = await SendAsAsync(otherTeacher, HttpMethod.Get, RosterUrl(group.Id));

            (await response.ShouldBeProblemAsync(HttpStatusCode.NotFound)).Title().ShouldBe("Groups.NotFound");
        }

        [Fact]
        public async Task Get_DeletedGroup_ShouldReturnNotFoundProblemToTeacherAndMember()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher);
            var student = await AddUserAsync("kwojcik");
            var group = await AddGroupAsync(teacher);
            await AddGroupMemberAsync(group, student);
            await SoftDeleteAsync(group);

            var asTeacher = await SendAsAsync(teacher, HttpMethod.Get, RosterUrl(group.Id));
            var asStudent = await SendAsAsync(student, HttpMethod.Get, RosterUrl(group.Id));

            await asTeacher.ShouldBeProblemAsync(HttpStatusCode.NotFound);
            await asStudent.ShouldBeProblemAsync(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Get_WhenStudentAccountWasDeleted_ShouldReturnNotFoundProblem()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher);
            var student = await AddUserAsync("kwojcik");
            var group = await AddGroupAsync(teacher);
            await AddGroupMemberAsync(group, student);
            await SoftDeleteAsync(student);

            var response = await SendAsAsync(student, HttpMethod.Get, RosterUrl(group.Id));

            await response.ShouldBeProblemAsync(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Get_AfterStudentWasRemovedFromTheGroup_ShouldReturnNotFoundProblemToThem()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher);
            var student = await AddUserAsync("kwojcik");
            var group = await AddGroupAsync(teacher);
            await AddGroupMemberAsync(group, student);
            var before = await SendAsAsync(student, HttpMethod.Get, RosterUrl(group.Id));

            var removal = await SendAsAsync(teacher, HttpMethod.Delete, $"/api/core/groups/{group.Id}/students/{student.Id}");
            var after = await SendAsAsync(student, HttpMethod.Get, RosterUrl(group.Id));

            before.StatusCode.ShouldBe(HttpStatusCode.OK);
            removal.StatusCode.ShouldBe(HttpStatusCode.NoContent);
            await after.ShouldBeProblemAsync(HttpStatusCode.NotFound);
        }

        [Theory]
        [InlineData(Role.Teacher, "0196f2a4-0000-7000-8000-000000000000")]
        [InlineData(Role.Student, "0196f2a4-0000-7000-8000-000000000000")]
        [InlineData(Role.Teacher, "not-a-guid")]
        [InlineData(Role.Student, "not-a-guid")]
        public async Task Get_UnknownOrMalformedId_ShouldReturnNotFoundProblem(Role role, string groupId)
        {
            // The game service treats 404 as "not your group" but anything like 400 as core being broken.
            var caller = await AddUserAsync("someone", role);

            var response = await SendAsAsync(caller, HttpMethod.Get, $"/api/core/groups/{groupId}/roster");

            await response.ShouldBeProblemAsync(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Get_AsAdmin_ShouldReturnForbiddenProblem()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var admin = await AddUserAsync("admin", Role.Admin);

            var response = await SendAsAsync(admin, HttpMethod.Get, RosterUrl(group.Id));

            await response.ShouldBeProblemAsync(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Get_WithoutToken_ShouldReturnUnauthorizedProblem()
        {
            var teacher = await AddUserAsync("jkowalski", Role.Teacher);
            var group = await AddGroupAsync(teacher);

            var response = await Client.GetAsync(RosterUrl(group.Id));

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }

        private static string RosterUrl(Guid groupId)
        {
            return $"/api/core/groups/{groupId}/roster";
        }
    }
}
