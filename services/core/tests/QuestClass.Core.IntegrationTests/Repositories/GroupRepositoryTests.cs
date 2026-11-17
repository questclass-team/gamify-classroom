using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuestClass.Core.Entities;
using QuestClass.Core.IntegrationTests.Infrastructure;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Repositories
{
    public sealed class GroupRepositoryTests : IntegrationTestBase
    {
        public GroupRepositoryTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task GetByTeacherAsync_ShouldSortNamesInPolishOrder()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            foreach (var name in new[] { "Zajęcia", "Ćwiczenia", "algorytmy", "Łamigłówki", "Bazy", "Lab" })
            {
                await AddGroupAsync(teacher, name);
            }

            var groups = await GetByTeacherAsync(teacher.Id);

            // The database default (bytes) would give: Bazy, Lab, Zajęcia, algorytmy, Ćwiczenia, Łamigłówki.
            groups.Select(item => item.Group.Name)
                .ShouldBe(["algorytmy", "Bazy", "Ćwiczenia", "Lab", "Łamigłówki", "Zajęcia"]);
        }

        [Fact]
        public async Task GetByTeacherAsync_ShouldReturnOnlyTheTeachersActiveGroups()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var otherTeacher = await AddUserAsync("mwisniewski", Role.Teacher);
            await AddGroupAsync(teacher, "Moja grupa");
            await AddGroupAsync(otherTeacher, "Cudza grupa");
            await SoftDeleteAsync(await AddGroupAsync(teacher, "Usunięta grupa"));

            var groups = await GetByTeacherAsync(teacher.Id);

            groups.ShouldHaveSingleItem().Group.Name.ShouldBe("Moja grupa");
        }

        [Fact]
        public async Task GetByTeacherAsync_ShouldCountOnlyStudentsWhoseAccountsExist()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var emptyGroup = await AddGroupAsync(teacher, "Pusta grupa");
            var student = await AddUserAsync("student");
            var deletedStudent = await AddUserAsync("kwojcik");
            await AddGroupMemberAsync(group, student);
            await AddGroupMemberAsync(group, deletedStudent);
            await SoftDeleteAsync(deletedStudent);

            var groups = await GetByTeacherAsync(teacher.Id);

            groups.Single(item => item.Group.Id == group.Id).StudentCount.ShouldBe(1);
            groups.Single(item => item.Group.Id == emptyGroup.Id).StudentCount.ShouldBe(0);
        }

        [Fact]
        public async Task GetOwnedAsync_ShouldReturnNullForAnotherTeachersOrDeletedGroup()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var otherTeacher = await AddUserAsync("mwisniewski", Role.Teacher);
            var own = await AddGroupAsync(teacher);
            var foreign = await AddGroupAsync(otherTeacher);
            var deleted = await AddGroupAsync(teacher);
            await SoftDeleteAsync(deleted);

            using var scope = CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<IGroupRepository>();

            (await repository.GetOwnedAsync(own.Id, teacher.Id)).ShouldNotBeNull().Name.ShouldBe(own.Name);
            (await repository.GetOwnedAsync(foreign.Id, teacher.Id)).ShouldBeNull();
            (await repository.GetOwnedAsync(deleted.Id, teacher.Id)).ShouldBeNull();
            (await repository.GetOwnedAsync(Guid.CreateVersion7(), teacher.Id)).ShouldBeNull();
        }

        [Fact]
        public async Task GetStudentsAsync_ShouldSortByNameInPolishOrderAndSkipDeletedAccounts()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var zajac = await AddUserAsync("azajac", firstName: "Anna", lastName: "Zając");
            var cwik = await AddUserAsync("acwik", firstName: "Anna", lastName: "Ćwik");
            var lucja = await AddUserAsync("lnowak", firstName: "Łucja", lastName: "Nowak");
            var deleted = await AddUserAsync("bkowal", firstName: "Bartek", lastName: "Kowal");
            foreach (var student in new[] { zajac, cwik, lucja, deleted })
            {
                await AddGroupMemberAsync(group, student);
            }

            await SoftDeleteAsync(deleted);

            using var scope = CreateScope();
            var students = await scope.ServiceProvider.GetRequiredService<IGroupRepository>().GetStudentsAsync(group.Id);

            students.Select(item => item.Student.DisplayName).ShouldBe(["Anna Ćwik", "Anna Zając", "Łucja Nowak"]);
        }

        [Fact]
        public async Task GroupMembers_ShouldNotAllowTheSameStudentTwiceInOneGroup()
        {
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            var group = await AddGroupAsync(teacher);
            var otherGroup = await AddGroupAsync(teacher, "Druga grupa");
            var student = await AddUserAsync("student");
            await AddGroupMemberAsync(group, student);

            // The same student in another group is fine; in the same group the key refuses it.
            await AddGroupMemberAsync(otherGroup, student);
            await Should.ThrowAsync<DbUpdateException>(
                () => AddGroupMemberAsync(group, student));
        }

        private async Task<IReadOnlyList<GroupWithStudentCount>> GetByTeacherAsync(Guid teacherId)
        {
            using var scope = CreateScope();

            return await scope.ServiceProvider.GetRequiredService<IGroupRepository>().GetByTeacherAsync(teacherId);
        }
    }
}
