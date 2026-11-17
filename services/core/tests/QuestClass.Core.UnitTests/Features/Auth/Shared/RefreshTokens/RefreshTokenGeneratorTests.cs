using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared.RefreshTokens;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Auth.Shared.RefreshTokens
{
    public sealed class RefreshTokenGeneratorTests
    {
        [Fact]
        public void Create_ShouldReturnUrlSafeTokenAndItsHash()
        {
            var (token, hash) = RefreshTokenGenerator.Create();

            token.Length.ShouldBe(43); // 32 random bytes in base64url without padding
            token.ShouldMatch("^[A-Za-z0-9_-]+$");
            hash.ShouldBe(RefreshTokenGenerator.Hash(token));
        }

        [Fact]
        public void Create_ShouldNeverRepeatATokenOrStoreItInClear()
        {
            var tokens = Enumerable.Range(0, 1000).Select(_ => RefreshTokenGenerator.Create()).ToList();

            tokens.Select(created => created.Token).Distinct().Count().ShouldBe(1000);
            tokens.ShouldAllBe(created => created.Hash != created.Token);
        }

        [Fact]
        public void Hash_ShouldBeLowerCaseSha256Hex()
        {
            var hash = RefreshTokenGenerator.Hash("abc");

            hash.ShouldBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
            hash.Length.ShouldBe(RefreshToken.TokenHashLength);
        }
    }
}
