using QuestClass.Core.Entities;
using Shouldly;

namespace QuestClass.Core.UnitTests.Entities
{
    public sealed class AvatarsTests
    {
        [Fact]
        public void Keys_ShouldBeTheSixteenAgreedWithTheFrontend()
        {
            // docs/api.md lists the same keys; the frontend draws one picture per key.
            Avatars.Keys.ShouldBe([
                "fox", "owl", "hedgehog", "cat", "wolf", "raven", "dragon", "phoenix",
                "comet", "star", "moon", "planet", "spark", "aurora", "wave", "galaxy"
            ]);
        }

        [Fact]
        public void Keys_ShouldBeUniqueLowerCaseAndFitTheColumn()
        {
            Avatars.Keys.ShouldBeUnique();
            Avatars.Keys.ShouldAllBe(key => key == key.ToLowerInvariant() && key.Length <= Avatars.KeyMaxLength);
        }

        [Theory]
        [InlineData("fox", true)]
        [InlineData("galaxy", true)]
        [InlineData("Fox", false)]
        [InlineData(" fox", false)]
        [InlineData("tiger", false)]
        [InlineData("", false)]
        public void IsKnown_ShouldMatchKeysExactly(string key, bool expected)
        {
            Avatars.IsKnown(key).ShouldBe(expected);
        }
    }
}
