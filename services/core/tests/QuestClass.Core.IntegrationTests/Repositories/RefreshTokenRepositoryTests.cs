using Microsoft.Extensions.DependencyInjection;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared.Tokens;
using QuestClass.Core.IntegrationTests.Infrastructure;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.IntegrationTests.Repositories
{
    public sealed class RefreshTokenRepositoryTests : IntegrationTestBase
    {
        public RefreshTokenRepositoryTests(IntegrationTestFixture fixture)
            : base(fixture)
        {
        }

        private static DateTimeOffset Now => DateTimeOffset.UtcNow;

        [Fact]
        public async Task TryRotateAsync_WhenTwoRequestsRotateTheSameTokenAtOnce_ShouldLetExactlyOneWin()
        {
            var user = await AddUserAsync("student");
            var current = await AddTokenAsync(user.Id, Now.AddHours(8));

            var results = await Task.WhenAll(Enumerable.Range(0, 5).Select(async _ =>
            {
                using var scope = CreateScope();
                var repository = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
                var (replacement, _) = RefreshTokenFactory.Create(user.Id, Now, current.ExpiresAt);

                return await repository.TryRotateAsync(current, replacement, Now);
            }));

            results.Count(won => won).ShouldBe(1);

            using var readScope = CreateScope();
            var stored = await readScope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>()
                .GetByHashAsync(current.TokenHash);
            stored!.RevokedReason.ShouldBe(RefreshTokenRevocation.Rotated);
            stored.ReplacedByTokenId.ShouldNotBeNull();
        }

        [Fact]
        public async Task RevokeAllForUserAsync_ShouldRevokeOnlyActiveTokensOfThatUser()
        {
            var student = await AddUserAsync("student");
            var teacher = await AddUserAsync("nauczyciel", Role.Teacher);
            await AddTokenAsync(student.Id, Now.AddHours(8));
            await AddTokenAsync(student.Id, Now.AddHours(8));
            var teachersToken = await AddTokenAsync(teacher.Id, Now.AddHours(8));

            using var scope = CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
            var revoked = await repository.RevokeAllForUserAsync(student.Id, RefreshTokenRevocation.ReuseDetected, Now);

            revoked.ShouldBe(2);
            (await repository.GetByHashAsync(teachersToken.TokenHash))!.RevokedAt.ShouldBeNull();
        }

        [Fact]
        public async Task DeleteExpiredAsync_ShouldRemoveOnlyEndedSessions()
        {
            var user = await AddUserAsync("student");
            var ended = await AddTokenAsync(user.Id, Now.AddMinutes(-1));
            var active = await AddTokenAsync(user.Id, Now.AddHours(8));

            using var scope = CreateScope();
            var repository = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
            var deleted = await repository.DeleteExpiredAsync(user.Id, Now);

            deleted.ShouldBe(1);
            (await repository.GetByHashAsync(ended.TokenHash)).ShouldBeNull();
            (await repository.GetByHashAsync(active.TokenHash)).ShouldNotBeNull();
        }

        private async Task<RefreshToken> AddTokenAsync(Guid userId, DateTimeOffset expiresAt)
        {
            var (token, _) = RefreshTokenFactory.Create(userId, Now.AddHours(-1), expiresAt);

            using var scope = CreateScope();
            await scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>().AddAsync(token);

            return token;
        }
    }
}
