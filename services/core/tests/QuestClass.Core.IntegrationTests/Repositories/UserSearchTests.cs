using Microsoft.Extensions.DependencyInjection;
using QuestClass.Core.Entities;
using QuestClass.Core.IntegrationTests.Infrastructure;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Repositories
{
    /// <summary>The search_text column is computed by PostgreSQL, so only a real database can test the search.</summary>
    public sealed class UserSearchTests : IntegrationTestBase
    {
        public UserSearchTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Theory]
        [InlineData("wojcik")]
        [InlineData("WÓJCIK")]
        [InlineData("katarzyna w")]
        [InlineData("kwoj")]
        [InlineData("Wój")]
        public async Task SearchStudentsAsync_ShouldMatchLoginOrNameIgnoringCaseAndPolishLetters(string query)
        {
            await AddUserAsync("kwojcik", firstName: "Katarzyna", lastName: "Wójcik");
            await AddUserAsync("pzielinski", firstName: "Piotr", lastName: "Zieliński");

            var students = await SearchAsync(query);

            students.ShouldHaveSingleItem().Login.ShouldBe("kwojcik");
        }

        [Fact]
        public async Task SearchStudentsAsync_ShouldFindNamesWithŁTypedAsL()
        {
            await AddUserAsync("lnowak", firstName: "Łucja", lastName: "Nowak");

            (await SearchAsync("lucja")).ShouldHaveSingleItem().Login.ShouldBe("lnowak");
        }

        [Fact]
        public async Task SearchStudentsAsync_ShouldReturnOnlyActiveStudentAccounts()
        {
            await AddUserAsync("anowak", firstName: "Anna", lastName: "Nowak");
            await AddUserAsync("bnowak", Role.Teacher, "Bartosz", "Nowak");
            await AddUserAsync("cnowak", Role.Admin, "Cezary", "Nowak");
            await SoftDeleteAsync(await AddUserAsync("dnowak", firstName: "Dorota", lastName: "Nowak"));

            var students = await SearchAsync("nowak");

            students.ShouldHaveSingleItem().Login.ShouldBe("anowak");
        }

        [Fact]
        public async Task SearchStudentsAsync_ShouldSortInPolishOrderAndStopAtTheLimit()
        {
            await AddUserAsync("zanna", firstName: "Anna", lastName: "Zając");
            await AddUserAsync("canna", firstName: "Anna", lastName: "Ćwik");
            await AddUserAsync("lanna", firstName: "Łucja", lastName: "Anna");
            await AddUserAsync("banna", firstName: "Anna", lastName: "Bąk");

            using var scope = CreateScope();
            var students = await scope.ServiceProvider.GetRequiredService<IUserRepository>().SearchStudentsAsync("anna", 3);

            students.Select(student => student.DisplayName).ShouldBe(["Anna Bąk", "Anna Ćwik", "Anna Zając"]);
        }

        [Theory]
        [InlineData("%")]
        [InlineData("__")]
        public async Task SearchStudentsAsync_ShouldTreatWildcardsAsPlainCharacters(string query)
        {
            await AddUserAsync("kwojcik", firstName: "Katarzyna", lastName: "Wójcik");

            (await SearchAsync(query)).ShouldBeEmpty();
        }

        [Fact]
        public async Task SearchStudentsAsync_WhenNameChanges_ShouldFindTheNewName()
        {
            // Names are refreshed from LDAP on every login; the generated column follows.
            var user = await AddUserAsync("kwojcik", firstName: "Katarzyna", lastName: "Wójcik");

            using (var scope = CreateScope())
            {
                var repository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
                var stored = (await repository.GetByIdAsync(user.Id))!;
                stored.LastName = "Żak";
                await repository.UpdateAsync(stored);
            }

            (await SearchAsync("katarzyna zak")).ShouldHaveSingleItem().Login.ShouldBe("kwojcik");
            (await SearchAsync("katarzyna wojcik")).ShouldBeEmpty();
        }

        private async Task<IReadOnlyList<User>> SearchAsync(string query)
        {
            using var scope = CreateScope();

            return await scope.ServiceProvider.GetRequiredService<IUserRepository>().SearchStudentsAsync(query, 10);
        }
    }
}
