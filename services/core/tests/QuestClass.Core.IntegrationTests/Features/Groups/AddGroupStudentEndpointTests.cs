using System.Net;
using System.Net.Http.Json;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.GetById;
using QuestClass.Core.Features.Groups.Shared;
using QuestClass.Core.IntegrationTests.Infrastructure;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Groups
{
    public sealed class AddGroupStudentEndpointTests : IntegrationTestBase
    {
        public AddGroupStudentEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task Add_ShouldReturnCreatedMemberAndShowItInTheGroup()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var student = await AddUserAsync("kwojcik", firstName: "Katarzyna", lastName: "Wójcik");

            var response = await AddAsync(teacher, group.Id, student.Id);

            response.StatusCode.ShouldBe(HttpStatusCode.Created);
            var member = (await response.Content.ReadFromJsonAsync<GroupStudentResponse>())!;
            (member.Id, member.Login, member.DisplayName).ShouldBe((student.Id, "kwojcik", "Katarzyna Wójcik"));

            var detail = await (await SendAsAsync(teacher, HttpMethod.Get, $"/api/core/groups/{group.Id}"))
                .Content.ReadFromJsonAsync<GroupDetailResponse>();
            detail!.Students.ShouldHaveSingleItem().Id.ShouldBe(student.Id);
        }

        [Fact]
        public async Task Add_SameStudentAgain_ShouldReturnExistingMemberWithoutDuplicating()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var student = await AddUserAsync("kwojcik");
            var first = await (await AddAsync(teacher, group.Id, student.Id)).Content.ReadFromJsonAsync<GroupStudentResponse>();

            var again = await AddAsync(teacher, group.Id, student.Id);

            again.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await again.Content.ReadFromJsonAsync<GroupStudentResponse>())!.AddedAt.ShouldBe(first!.AddedAt, TimeSpan.FromMilliseconds(1));
            (await StudentCountAsync(teacher, group.Id)).ShouldBe(1);
        }

        [Fact]
        public async Task Add_SameStudentInParallel_ShouldCreateOneMembership()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var student = await AddUserAsync("kwojcik");

            var responses = await Task.WhenAll(Enumerable.Range(0, 5).Select(_ => AddAsync(teacher, group.Id, student.Id)));

            responses.Select(response => response.StatusCode).ShouldAllBe(status =>
                status == HttpStatusCode.Created || status == HttpStatusCode.OK);
            responses.Count(response => response.StatusCode == HttpStatusCode.Created).ShouldBe(1);
            (await StudentCountAsync(teacher, group.Id)).ShouldBe(1);
        }

        [Fact]
        public async Task Add_SameStudentToTwoGroups_ShouldPutThemInBoth()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var algorithms = await AddGroupAsync(teacher, "Algorytmy");
            var databases = await AddGroupAsync(teacher, "Bazy danych");
            var student = await AddUserAsync("kwojcik");

            (await AddAsync(teacher, algorithms.Id, student.Id)).StatusCode.ShouldBe(HttpStatusCode.Created);
            (await AddAsync(teacher, databases.Id, student.Id)).StatusCode.ShouldBe(HttpStatusCode.Created);

            (await StudentCountAsync(teacher, algorithms.Id)).ShouldBe(1);
            (await StudentCountAsync(teacher, databases.Id)).ShouldBe(1);
        }

        [Fact]
        public async Task Add_ToAnotherTeachersGroup_ShouldReturnGroupNotFound()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var otherTeacher = await AddUserAsync("mwisniewski", Role.Teacher);
            var foreignGroup = await AddGroupAsync(otherTeacher);
            var student = await AddUserAsync("kwojcik");

            var response = await AddAsync(teacher, foreignGroup.Id, student.Id);

            (await response.ShouldBeProblemAsync(HttpStatusCode.NotFound)).Title().ShouldBe("Groups.NotFound");
            (await StudentCountAsync(otherTeacher, foreignGroup.Id)).ShouldBe(0);
        }

        [Theory]
        [InlineData(Role.Teacher)]
        [InlineData(Role.Admin)]
        public async Task Add_AccountThatIsNotAStudent_ShouldReturnStudentNotFound(Role role)
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var account = await AddUserAsync("someone", role);

            var response = await AddAsync(teacher, group.Id, account.Id);

            (await response.ShouldBeProblemAsync(HttpStatusCode.NotFound)).Title().ShouldBe("Groups.StudentNotFound");
        }

        [Fact]
        public async Task Add_DeletedOrUnknownAccount_ShouldReturnStudentNotFound()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var deleted = await AddUserAsync("kwojcik");
            await SoftDeleteAsync(deleted);

            (await (await AddAsync(teacher, group.Id, deleted.Id)).ShouldBeProblemAsync(HttpStatusCode.NotFound))
                .Title().ShouldBe("Groups.StudentNotFound");
            (await (await AddAsync(teacher, group.Id, Guid.CreateVersion7())).ShouldBeProblemAsync(HttpStatusCode.NotFound))
                .Title().ShouldBe("Groups.StudentNotFound");
        }

        [Fact]
        public async Task Add_WithoutStudentId_ShouldReturnValidationProblem()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);

            var response = await SendAsAsync(teacher, HttpMethod.Post, $"/api/core/groups/{group.Id}/students", new { });

            await response.ShouldBeProblemAsync(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Add_WhenCallerIsAStudent_ShouldReturnForbiddenProblem()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var student = await AddUserAsync("kwojcik");

            var response = await AddAsync(student, group.Id, student.Id);

            await response.ShouldBeProblemAsync(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Add_WithoutToken_ShouldReturnUnauthorizedProblem()
        {
            var response = await Client.PostAsJsonAsync(
                $"/api/core/groups/{Guid.CreateVersion7()}/students",
                new { studentId = Guid.CreateVersion7() });

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }

        private Task<HttpResponseMessage> AddAsync(User caller, Guid groupId, Guid studentId)
        {
            return SendAsAsync(caller, HttpMethod.Post, $"/api/core/groups/{groupId}/students", new { studentId });
        }

        private async Task<int> StudentCountAsync(User teacher, Guid groupId)
        {
            var detail = await (await SendAsAsync(teacher, HttpMethod.Get, $"/api/core/groups/{groupId}"))
                .Content.ReadFromJsonAsync<GroupDetailResponse>();

            return detail!.Students.Count;
        }
    }
}
