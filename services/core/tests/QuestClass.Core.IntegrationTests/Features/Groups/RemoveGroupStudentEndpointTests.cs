using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Groups.GetById;
using QuestClass.Core.IntegrationTests.Infrastructure;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Groups
{
    public sealed class RemoveGroupStudentEndpointTests : IntegrationTestBase
    {
        public RemoveGroupStudentEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task Remove_ShouldTakeTheStudentOutOfThisGroupOnly()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var algorithms = await AddGroupAsync(teacher, "Algorytmy");
            var databases = await AddGroupAsync(teacher, "Bazy danych");
            var student = await AddUserAsync("kwojcik");
            var classmate = await AddUserAsync("pzielinski");
            await AddGroupMemberAsync(algorithms, student);
            await AddGroupMemberAsync(algorithms, classmate);
            await AddGroupMemberAsync(databases, student);

            var response = await RemoveAsync(teacher, algorithms.Id, student.Id);

            response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
            (await StudentIdsAsync(teacher, algorithms.Id)).ShouldBe([classmate.Id]);
            (await StudentIdsAsync(teacher, databases.Id)).ShouldBe([student.Id]);

            using var scope = CreateScope();
            (await scope.ServiceProvider.GetRequiredService<IUserRepository>().GetByIdAsync(student.Id)).ShouldNotBeNull();
        }

        [Fact]
        public async Task Remove_StudentWhoIsNotInTheGroup_ShouldStillReturnNoContent()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var student = await AddUserAsync("kwojcik");
            await AddGroupMemberAsync(group, student);

            (await RemoveAsync(teacher, group.Id, student.Id)).StatusCode.ShouldBe(HttpStatusCode.NoContent);
            (await RemoveAsync(teacher, group.Id, student.Id)).StatusCode.ShouldBe(HttpStatusCode.NoContent);
            (await RemoveAsync(teacher, group.Id, Guid.CreateVersion7())).StatusCode.ShouldBe(HttpStatusCode.NoContent);
        }

        [Fact]
        public async Task Remove_FromAnotherTeachersGroup_ShouldReturnNotFoundAndKeepTheStudent()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var otherTeacher = await AddUserAsync("mwisniewski", Role.Teacher);
            var foreignGroup = await AddGroupAsync(otherTeacher);
            var student = await AddUserAsync("kwojcik");
            await AddGroupMemberAsync(foreignGroup, student);

            var response = await RemoveAsync(teacher, foreignGroup.Id, student.Id);

            (await response.ShouldBeProblemAsync(HttpStatusCode.NotFound)).Title().ShouldBe("Groups.NotFound");
            (await StudentIdsAsync(otherTeacher, foreignGroup.Id)).ShouldBe([student.Id]);
        }

        [Fact]
        public async Task Remove_WhenCallerIsAStudent_ShouldReturnForbiddenProblem()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var student = await AddUserAsync("kwojcik");
            await AddGroupMemberAsync(group, student);

            var response = await RemoveAsync(student, group.Id, student.Id);

            await response.ShouldBeProblemAsync(HttpStatusCode.Forbidden);
        }

        [Fact]
        public async Task Remove_WithoutToken_ShouldReturnUnauthorizedProblem()
        {
            var response = await Client.DeleteAsync($"/api/core/groups/{Guid.CreateVersion7()}/students/{Guid.CreateVersion7()}");

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }

        private Task<HttpResponseMessage> RemoveAsync(User caller, Guid groupId, Guid studentId)
        {
            return SendAsAsync(caller, HttpMethod.Delete, $"/api/core/groups/{groupId}/students/{studentId}");
        }

        private async Task<IReadOnlyList<Guid>> StudentIdsAsync(User teacher, Guid groupId)
        {
            var detail = await (await SendAsAsync(teacher, HttpMethod.Get, $"/api/core/groups/{groupId}"))
                .Content.ReadFromJsonAsync<GroupDetailResponse>();

            return detail!.Students.Select(student => student.Id).ToList();
        }
    }
}
