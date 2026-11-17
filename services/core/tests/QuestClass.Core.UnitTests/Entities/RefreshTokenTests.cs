using QuestClass.Core.Entities;
using Shouldly;

namespace QuestClass.Core.UnitTests.Entities
{
    public sealed class RefreshTokenTests
    {
        private static readonly DateTimeOffset _now = new(2026, 11, 18, 9, 0, 0, TimeSpan.Zero);

        [Fact]
        public void IsActive_WhenNotRevokedAndSessionNotOver_ShouldBeTrue()
        {
            Token(expiresAt: _now.AddHours(1)).IsActive(_now).ShouldBeTrue();
        }

        [Fact]
        public void IsActive_WhenSessionIsOver_ShouldBeFalse()
        {
            Token(expiresAt: _now).IsActive(_now).ShouldBeFalse();
        }

        [Fact]
        public void IsActive_WhenRevoked_ShouldBeFalse()
        {
            var token = Token(expiresAt: _now.AddHours(1));
            token.RevokedAt = _now.AddMinutes(-1);

            token.IsActive(_now).ShouldBeFalse();
        }

        private static RefreshToken Token(DateTimeOffset expiresAt)
        {
            return new RefreshToken
            {
                UserId = Guid.CreateVersion7(),
                TokenHash = new string('a', RefreshToken.TokenHashLength),
                CreatedAt = _now.AddHours(-1),
                ExpiresAt = expiresAt
            };
        }
    }
}
