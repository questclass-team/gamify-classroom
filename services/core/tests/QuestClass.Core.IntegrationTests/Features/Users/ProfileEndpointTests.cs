using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Users.Shared;
using QuestClass.Core.IntegrationTests.Infrastructure;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Users
{
    public sealed class ProfileEndpointTests : IntegrationTestBase
    {
        private const string ProfileUrl = "/api/core/me/profile";

        public ProfileEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task Get_WhenNoNicknameYet_ShouldReturnNullNickname()
        {
            var student = await AddUserAsync("kwojcik");

            var response = await SendAsAsync(student, HttpMethod.Get, ProfileUrl);

            // frontend/src/api/types.ts: StudentProfile { nickname: string | null }
            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            body.EnumerateObject().Select(property => property.Name).ShouldBe(["nickname"]);
            body.GetProperty("nickname").ValueKind.ShouldBe(JsonValueKind.Null);
        }

        [Fact]
        public async Task Put_ShouldSaveTheTrimmedNicknameAndGetShouldReturnIt()
        {
            var student = await AddUserAsync("kwojcik");

            var put = await SendAsAsync(student, HttpMethod.Put, ProfileUrl, new { nickname = "  Cichy Lis " });

            put.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await put.Content.ReadFromJsonAsync<ProfileResponse>())!.Nickname.ShouldBe("Cichy Lis");

            var get = await SendAsAsync(student, HttpMethod.Get, ProfileUrl);
            (await get.Content.ReadFromJsonAsync<ProfileResponse>())!.Nickname.ShouldBe("Cichy Lis");

            using var scope = CreateScope();
            var saved = await scope.ServiceProvider.GetRequiredService<IUserRepository>().GetByIdAsync(student.Id);
            saved.ShouldNotBeNull().Nickname.ShouldBe("Cichy Lis");
        }

        [Fact]
        public async Task Put_ShouldReplaceAnEarlierNickname()
        {
            var student = await AddUserAsync("kwojcik", nickname: "Cichy Lis");

            var response = await SendAsAsync(student, HttpMethod.Put, ProfileUrl, new { nickname = "Szybki Zając" });

            (await response.Content.ReadFromJsonAsync<ProfileResponse>())!.Nickname.ShouldBe("Szybki Zając");
        }

        [Theory]
        [InlineData("Cichy Lis", "cichy lis")]
        [InlineData("Cichy Lis", "CICHY LIS")]
        [InlineData("Łucznik", "łUCZNIK")]
        [InlineData("Волк", "ВОЛК")]
        [InlineData("Krét", "Kre\u0301t")]
        public async Task Put_WhenAnotherStudentHasTheNicknameInAnyLetterCase_ShouldReturnConflictProblem(
            string taken,
            string requested)
        {
            await AddUserAsync("anowak", nickname: taken);
            var student = await AddUserAsync("kwojcik");

            var response = await SendAsAsync(student, HttpMethod.Put, ProfileUrl, new { nickname = requested });

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.Conflict);
            problem.Title().ShouldBe("Profile.NicknameTaken");
            (await GetSavedNicknameAsync(student.Id)).ShouldBeNull();
        }

        [Fact]
        public async Task Put_WhenNicknameDiffersOnlyByAccent_ShouldBeAllowed()
        {
            await AddUserAsync("anowak", nickname: "Krét");
            var student = await AddUserAsync("kwojcik");

            var response = await SendAsAsync(student, HttpMethod.Put, ProfileUrl, new { nickname = "Kret" });

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Put_WhenADeletedAccountHasTheNickname_ShouldReturnConflictProblem()
        {
            // A deleted account is restored on re-import, with its nickname.
            var deleted = await AddUserAsync("anowak", nickname: "Cichy Lis");
            await SoftDeleteAsync(deleted);
            var student = await AddUserAsync("kwojcik");

            var response = await SendAsAsync(student, HttpMethod.Put, ProfileUrl, new { nickname = "cichy lis" });

            (await response.ShouldBeProblemAsync(HttpStatusCode.Conflict)).Title().ShouldBe("Profile.NicknameTaken");
        }

        [Fact]
        public async Task Put_WhenStudentChangesTheLetterCaseOfTheirOwnNickname_ShouldSaveIt()
        {
            var student = await AddUserAsync("kwojcik", nickname: "cichy lis");

            var response = await SendAsAsync(student, HttpMethod.Put, ProfileUrl, new { nickname = "Cichy Lis" });

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await GetSavedNicknameAsync(student.Id)).ShouldBe("Cichy Lis");
        }

        [Fact]
        public async Task Put_SameNicknameTwice_ShouldSucceedBothTimes()
        {
            var student = await AddUserAsync("kwojcik");

            var first = await SendAsAsync(student, HttpMethod.Put, ProfileUrl, new { nickname = "Cichy Lis" });
            var second = await SendAsAsync(student, HttpMethod.Put, ProfileUrl, new { nickname = "Cichy Lis" });

            first.StatusCode.ShouldBe(HttpStatusCode.OK);
            second.StatusCode.ShouldBe(HttpStatusCode.OK);
        }

        [Fact]
        public async Task Put_TwoStudentsRacingForOneNickname_ShouldLetOnlyOneWin()
        {
            var first = await AddUserAsync("anowak");
            var second = await AddUserAsync("kwojcik");

            var responses = await Task.WhenAll(
                SendAsAsync(first, HttpMethod.Put, ProfileUrl, new { nickname = "Cichy Lis" }),
                SendAsAsync(second, HttpMethod.Put, ProfileUrl, new { nickname = "CICHY LIS" }));

            responses.Select(response => response.StatusCode).Order()
                .ShouldBe([HttpStatusCode.OK, HttpStatusCode.Conflict]);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData("ab")]
        [InlineData("abcdefghijklmnopqrstuvwxy")]
        [InlineData("_Lis")]
        [InlineData("Lis.")]
        [InlineData("Lis!")]
        [InlineData("Lis 😀")]
        public async Task Put_WithInvalidNickname_ShouldReturnValidationProblemUnderNicknameProperty(string nickname)
        {
            var student = await AddUserAsync("kwojcik", nickname: "Cichy Lis");

            var response = await SendAsAsync(student, HttpMethod.Put, ProfileUrl, new { nickname });

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.BadRequest);
            problem.GetProperty("errors").GetProperty("Nickname").GetArrayLength().ShouldBe(1);
            (await GetSavedNicknameAsync(student.Id)).ShouldBe("Cichy Lis");
        }

        [Fact]
        public async Task Put_WithoutNicknameField_ShouldReturnValidationProblemUnderNicknameProperty()
        {
            var student = await AddUserAsync("kwojcik");

            var response = await SendAsAsync(student, HttpMethod.Put, ProfileUrl, new { });

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.BadRequest);
            problem.GetProperty("errors").GetProperty("Nickname")[0].GetString().ShouldBe("Nickname is required.");
        }

        [Theory]
        [InlineData(Role.Teacher)]
        [InlineData(Role.Admin)]
        public async Task Get_WhenCallerIsNotAStudent_ShouldReturnForbiddenProblem(Role role)
        {
            var caller = await AddUserAsync("someone", role);

            var response = await SendAsAsync(caller, HttpMethod.Get, ProfileUrl);

            await response.ShouldBeProblemAsync(HttpStatusCode.Forbidden);
        }

        [Theory]
        [InlineData(Role.Teacher)]
        [InlineData(Role.Admin)]
        public async Task Put_WhenCallerIsNotAStudent_ShouldReturnForbiddenProblemAndSaveNothing(Role role)
        {
            var caller = await AddUserAsync("someone", role);

            var response = await SendAsAsync(caller, HttpMethod.Put, ProfileUrl, new { nickname = "Cichy Lis" });

            await response.ShouldBeProblemAsync(HttpStatusCode.Forbidden);
            (await GetSavedNicknameAsync(caller.Id)).ShouldBeNull();
        }

        [Fact]
        public async Task GetAndPut_WithoutToken_ShouldReturnUnauthorizedProblem()
        {
            var get = await Client.GetAsync(ProfileUrl);
            var put = await Client.PutAsJsonAsync(ProfileUrl, new { nickname = "Cichy Lis" });

            await get.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
            await put.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetAndPut_WhenAccountWasDeletedAfterLogin_ShouldReturnUnauthorizedProblem()
        {
            var student = await AddUserAsync("kwojcik");
            await SoftDeleteAsync(student);

            var get = await SendAsAsync(student, HttpMethod.Get, ProfileUrl);
            var put = await SendAsAsync(student, HttpMethod.Put, ProfileUrl, new { nickname = "Cichy Lis" });

            (await get.ShouldBeProblemAsync(HttpStatusCode.Unauthorized)).Title().ShouldBe("Auth.SessionUserNotFound");
            (await put.ShouldBeProblemAsync(HttpStatusCode.Unauthorized)).Title().ShouldBe("Auth.SessionUserNotFound");
        }

        private async Task<string?> GetSavedNicknameAsync(Guid userId)
        {
            using var scope = CreateScope();
            var user = await scope.ServiceProvider.GetRequiredService<IUserRepository>().GetByIdAsync(userId);

            return user.ShouldNotBeNull().Nickname;
        }
    }
}
