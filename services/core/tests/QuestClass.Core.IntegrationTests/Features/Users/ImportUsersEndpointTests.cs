using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using DotNet.Testcontainers.Builders;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuestClass.Core.Common.Persistence;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Users.Import;
using QuestClass.Core.IntegrationTests.Infrastructure;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Users
{
    public sealed class ImportUsersEndpointTests : IntegrationTestBase
    {
        private const string ImportUrl = "/api/core/admin/users/import";
        private const string Header = "login,first_name,last_name,role\n";

        public ImportUsersEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task Import_ShouldCreateAccountsThatCanThenLogIn()
        {
            var admin = await AddUserAsync("admin", Role.Admin);

            var response = await ImportAsync(admin, Header + "nauczyciel,Jan,Kowalski,teacher\nstudent,Ewa,Nowak,student\n");

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            var report = (await response.Content.ReadFromJsonAsync<UserImportReport>())!;
            report.Created.ShouldBe([
                new ImportedUser(2, "nauczyciel", "Jan Kowalski", "teacher"),
                new ImportedUser(3, "student", "Ewa Nowak", "student")
            ]);
            report.Skipped.ShouldBeEmpty();

            // SCRUM-7: only an imported account that passes LDAP may log in, with the role from the file.
            var login = await Client.PostAsJsonAsync("/api/core/auth/login", new { login = "nauczyciel", password = "haslo" });
            login.StatusCode.ShouldBe(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Import_KW1_ThirtyAccountsWithFiveExisting_ShouldCreateTwentyFiveAndSkipFive()
        {
            // Acceptance criterion KW-1 from the project requirements.
            var admin = await AddUserAsync("admin", Role.Admin);
            for (var index = 1; index <= 5; index++)
            {
                await AddUserAsync($"student{index:00}");
            }

            var csv = new StringBuilder(Header);
            for (var index = 1; index <= 30; index++)
            {
                csv.AppendLine($"student{index:00},Imie{index},Nazwisko{index},student");
            }

            var report = await ImportReportAsync(admin, csv.ToString());

            report.Created.Count.ShouldBe(25);
            report.Skipped.Count.ShouldBe(5);
            report.Skipped.ShouldAllBe(row => row.Reason == ImportSkipReasons.AlreadyExists);
            (await CountUsersAsync()).ShouldBe(31); // 30 students + admin
        }

        [Fact]
        public async Task Import_SameFileTwice_ShouldNotCreateDuplicates()
        {
            var admin = await AddUserAsync("admin", Role.Admin);
            const string csv = Header + "nauczyciel,Jan,Kowalski,teacher\nstudent,Ewa,Nowak,student\n";
            await ImportReportAsync(admin, csv);

            var second = await ImportReportAsync(admin, csv);

            second.Created.ShouldBeEmpty();
            second.Skipped.Select(row => row.Reason).ShouldAllBe(reason => reason == ImportSkipReasons.AlreadyExists);
            (await CountUsersAsync()).ShouldBe(3);
        }

        [Fact]
        public async Task Import_RepositorySampleFile_ShouldImportEveryTestAccount()
        {
            var admin = await AddUserAsync("admin", Role.Admin);
            var sample = Path.Combine(CommonDirectoryPath.GetGitDirectory().DirectoryPath, "infra", "ldap", "sample-import.csv");

            var report = await ImportReportAsync(admin, await File.ReadAllBytesAsync(sample));

            report.Skipped.ShouldHaveSingleItem().ShouldBe(new SkippedImportRow(2, "admin", ImportSkipReasons.AlreadyExists));
            report.Created.Count.ShouldBe(10);
            report.Created.ShouldContain(user => user.Login == "mwisniewski" && user.DisplayName == "Marek Wiśniewski");
        }

        [Fact]
        public async Task Import_WhenAccountWasDeleted_ShouldRestoreTheSameAccount()
        {
            var admin = await AddUserAsync("admin", Role.Admin);
            var deleted = await AddUserAsync("student");
            using (var scope = CreateScope())
            {
                var repository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
                await repository.DeleteAsync((await repository.GetByIdAsync(deleted.Id))!);
            }

            var report = await ImportReportAsync(admin, Header + "student,Ewa,Nowak,teacher\n");

            report.Created.ShouldHaveSingleItem().Role.ShouldBe("teacher");
            using var readScope = CreateScope();
            var restored = await readScope.ServiceProvider.GetRequiredService<IUserRepository>().GetByLoginAsync("student");
            restored.ShouldNotBeNull();
            restored.Id.ShouldBe(deleted.Id);
            restored.Role.ShouldBe(Role.Teacher);
        }

        [Fact]
        public async Task Import_SemicolonFileWithByteOrderMarkAsExcelSavesIt_ShouldWork()
        {
            var admin = await AddUserAsync("admin", Role.Admin);
            var bytes = Encoding.UTF8.GetPreamble()
                .Concat(Encoding.UTF8.GetBytes("login;first_name;last_name;role\r\nanowak;\"Anna; Maria\";Nowak;student\r\n"))
                .ToArray();

            var report = await ImportReportAsync(admin, bytes);

            report.Created.ShouldHaveSingleItem().DisplayName.ShouldBe("Anna; Maria Nowak");
        }

        [Theory]
        [InlineData(Role.Teacher)]
        [InlineData(Role.Student)]
        public async Task Import_ByNonAdmin_ShouldBeForbidden(Role role)
        {
            var caller = await AddUserAsync("caller", role);

            var response = await ImportAsync(caller, Header + "nowy,Jan,Kowalski,admin\n");

            await response.ShouldBeProblemAsync(HttpStatusCode.Forbidden);
            (await CountUsersAsync()).ShouldBe(1);
        }

        [Fact]
        public async Task Import_WithoutToken_ShouldBeUnauthorized()
        {
            var response = await Client.PostAsync(ImportUrl, CsvContent(Encoding.UTF8.GetBytes(Header)));

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Import_WithoutFile_ShouldReturnValidationProblem()
        {
            var admin = await AddUserAsync("admin", Role.Admin);
            var request = new HttpRequestMessage(HttpMethod.Post, ImportUrl)
            {
                Content = new MultipartFormDataContent { { new StringContent("x"), "other" } }
            };
            UseToken(request, IssueTokenFor(admin));

            var response = await Client.SendAsync(request);

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.BadRequest);
            problem.GetProperty("errors").GetProperty("File")[0].GetString()
                .ShouldBe("Attach the CSV file in the multipart field \"file\".");
        }

        [Fact]
        public async Task Import_WithWrongHeader_ShouldReturnBadRequestProblem()
        {
            var admin = await AddUserAsync("admin", Role.Admin);

            var response = await ImportAsync(admin, "jkowalski,Jan,Kowalski,teacher\n");

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.BadRequest);
            problem.Title().ShouldBe("Users.InvalidImportHeader");
        }

        [Fact]
        public async Task Import_WhenFileIsNotUtf8_ShouldReturnBadRequestProblem()
        {
            var admin = await AddUserAsync("admin", Role.Admin);
            var bytes = Encoding.ASCII.GetBytes(Header + "mwisniewski,Marek,Wi?niewski,teacher\n");
            bytes[Array.IndexOf(bytes, (byte)'?')] = 0x9C; // 'ś' in Windows-1250

            var response = await ImportAsync(admin, bytes);

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.BadRequest);
            problem.Title().ShouldBe("Users.ImportNotUtf8");
            (await CountUsersAsync()).ShouldBe(1);
        }

        [Fact]
        public async Task Import_WhenFileIsLargerThanOneMegabyte_ShouldReturnPayloadTooLargeProblem()
        {
            var admin = await AddUserAsync("admin", Role.Admin);
            var bytes = Encoding.UTF8.GetBytes(Header + new string('a', (int)ImportUsersHandler.MaxFileBytes));

            var response = await ImportAsync(admin, bytes);

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.RequestEntityTooLarge);
            problem.Title().ShouldBe("Users.ImportFileTooLarge");
        }

        private Task<HttpResponseMessage> ImportAsync(User caller, string csv)
        {
            return ImportAsync(caller, Encoding.UTF8.GetBytes(csv));
        }

        private Task<HttpResponseMessage> ImportAsync(User caller, byte[] file)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, ImportUrl) { Content = CsvContent(file) };
            UseToken(request, IssueTokenFor(caller));
            return Client.SendAsync(request);
        }

        private async Task<UserImportReport> ImportReportAsync(User caller, string csv)
        {
            return await ImportReportAsync(caller, Encoding.UTF8.GetBytes(csv));
        }

        private async Task<UserImportReport> ImportReportAsync(User caller, byte[] file)
        {
            var response = await ImportAsync(caller, file);
            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            return (await response.Content.ReadFromJsonAsync<UserImportReport>())!;
        }

        private static MultipartFormDataContent CsvContent(byte[] file)
        {
            var fileContent = new ByteArrayContent(file);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("text/csv");

            return new MultipartFormDataContent { { fileContent, "file", "accounts.csv" } };
        }

        private async Task<int> CountUsersAsync()
        {
            using var scope = CreateScope();
            return await scope.ServiceProvider.GetRequiredService<CoreDbContext>().Users.CountAsync();
        }
    }
}
