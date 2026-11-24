namespace QuestClass.Core.Entities
{
    /// <summary>
    /// The ready-made avatars a student chooses from (FR-21). Only the key is stored; the frontend draws the picture
    /// for it. A fixed set instead of uploaded pictures keeps students anonymous to each other (project vision: "nick i
    /// awatar zapewniające anonimowość", NFR-03) and stores no photos, which would be personal data.
    /// Keep in step with docs/api.md and the frontend's avatar pictures.
    /// </summary>
    public static class Avatars
    {
        /// <summary>Column length; leaves room for longer keys added later.</summary>
        public const int KeyMaxLength = 32;

        public static IReadOnlyList<string> Keys { get; } =
        [
            "fox", "owl", "hedgehog", "cat", "wolf", "raven", "dragon", "phoenix",
            "comet", "star", "moon", "planet", "spark", "aurora", "wave", "galaxy"
        ];

        /// <summary>Exact match: keys are lower-case and compared as sent, "Fox" is not a key.</summary>
        public static bool IsKnown(string key)
        {
            ArgumentNullException.ThrowIfNull(key);

            return Keys.Contains(key, StringComparer.Ordinal);
        }
    }
}
