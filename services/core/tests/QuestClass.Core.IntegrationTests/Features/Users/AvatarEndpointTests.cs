using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Users.Shared;
using QuestClass.Core.IntegrationTests.Infrastructure;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Features.Users
{
    public sealed class AvatarEndpointTests : IntegrationTestBase
    {
        private const string AvatarUrl = "/api/core/me/avatar";
        private const string ProfileUrl = "/api/core/me/profile";

        public AvatarEndpointTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        [Fact]
        public async Task Put_ShouldSaveTheAvatarAndKeepTheNickname()
        {
            var student = await AddUserAsync("kwojcik", nickname: "Cichy Lis");

            var put = await SendAsAsync(student, HttpMethod.Put, AvatarUrl, new { avatar = "fox" });

            put.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await put.Content.ReadFromJsonAsync<ProfileResponse>()).ShouldBe(new ProfileResponse("Cichy Lis", "fox"));
            var get = await SendAsAsync(student, HttpMethod.Get, ProfileUrl);
            (await get.Content.ReadFromJsonAsync<ProfileResponse>()).ShouldBe(new ProfileResponse("Cichy Lis", "fox"));
            (await GetSavedAsync(student.Id)).Avatar.ShouldBe("fox");
        }

        [Fact]
        public async Task Put_ShouldReplaceAnEarlierAvatar()
        {
            var student = await AddUserAsync("kwojcik", avatar: "fox");

            await SendAsAsync(student, HttpMethod.Put, AvatarUrl, new { avatar = "galaxy" });

            (await GetSavedAsync(student.Id)).Avatar.ShouldBe("galaxy");
        }

        [Fact]
        public async Task Put_WithNull_ShouldRemoveTheAvatar()
        {
            var student = await AddUserAsync("kwojcik", avatar: "fox");

            var response = await SendAsAsync(student, HttpMethod.Put, AvatarUrl, new { avatar = (string?)null });

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await response.Content.ReadFromJsonAsync<ProfileResponse>())!.Avatar.ShouldBeNull();
            (await GetSavedAsync(student.Id)).Avatar.ShouldBeNull();
        }

        [Fact]
        public async Task Put_WithoutAvatarField_ShouldRemoveTheAvatar()
        {
            var student = await AddUserAsync("kwojcik", avatar: "fox");

            var response = await SendAsAsync(student, HttpMethod.Put, AvatarUrl, new { });

            response.StatusCode.ShouldBe(HttpStatusCode.OK);
            (await GetSavedAsync(student.Id)).Avatar.ShouldBeNull();
        }

        [Theory]
        [InlineData("tiger")]
        [InlineData("Fox")]
        [InlineData("")]
        [InlineData("../../etc/passwd")]
        public async Task Put_WithUnknownKey_ShouldReturnValidationProblemUnderAvatarAndSaveNothing(string avatar)
        {
            var student = await AddUserAsync("kwojcik", avatar: "owl");

            var response = await SendAsAsync(student, HttpMethod.Put, AvatarUrl, new { avatar });

            var problem = await response.ShouldBeProblemAsync(HttpStatusCode.BadRequest);
            problem.GetProperty("errors").GetProperty("Avatar")[0].GetString()!
                .ShouldStartWith("Avatar must be null or one of:");
            (await GetSavedAsync(student.Id)).Avatar.ShouldBe("owl");
        }

        [Fact]
        public async Task PutAvatarAndNicknameAtTheSameTime_ShouldKeepBothChanges()
        {
            // Each request writes only its own column, so neither overwrites the other with an old value.
            for (var attempt = 0; attempt < 10; attempt++)
            {
                var student = await AddUserAsync($"student{attempt}");
                var avatar = Avatars.Keys[attempt];
                var nickname = $"Student {attempt}";

                var responses = await Task.WhenAll(
                    SendAsAsync(student, HttpMethod.Put, AvatarUrl, new { avatar }),
                    SendAsAsync(student, HttpMethod.Put, ProfileUrl, new { nickname }));

                responses.ShouldAllBe(response => response.StatusCode == HttpStatusCode.OK);
                var saved = await GetSavedAsync(student.Id);
                (saved.Nickname, saved.Avatar).ShouldBe((nickname, avatar));
            }
        }

        [Theory]
        [InlineData(Role.Teacher)]
        [InlineData(Role.Admin)]
        public async Task Put_WhenCallerIsNotAStudent_ShouldReturnForbiddenProblemAndSaveNothing(Role role)
        {
            var caller = await AddUserAsync("someone", role);

            var response = await SendAsAsync(caller, HttpMethod.Put, AvatarUrl, new { avatar = "fox" });

            await response.ShouldBeProblemAsync(HttpStatusCode.Forbidden);
            (await GetSavedAsync(caller.Id)).Avatar.ShouldBeNull();
        }

        [Fact]
        public async Task Put_WithoutToken_ShouldReturnUnauthorizedProblem()
        {
            var response = await Client.PutAsJsonAsync(AvatarUrl, new { avatar = "fox" });

            await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Put_WhenAccountWasDeletedAfterLogin_ShouldReturnUnauthorizedProblem()
        {
            var student = await AddUserAsync("kwojcik");
            await SoftDeleteAsync(student);

            var response = await SendAsAsync(student, HttpMethod.Put, AvatarUrl, new { avatar = "fox" });

            (await response.ShouldBeProblemAsync(HttpStatusCode.Unauthorized)).Title().ShouldBe("Auth.SessionUserNotFound");
        }

        private async Task<User> GetSavedAsync(Guid userId)
        {
            using var scope = CreateScope();

            return (await scope.ServiceProvider.GetRequiredService<IUserRepository>().GetByIdAsync(userId)).ShouldNotBeNull();
        }
    }
}
