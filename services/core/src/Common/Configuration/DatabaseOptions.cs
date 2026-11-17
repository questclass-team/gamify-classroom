namespace QuestClass.Core.Common.Configuration
{
    public sealed class DatabaseOptions
    {
        public const string SectionName = "ConnectionStrings";

        /// <summary>PostgreSQL connection string, set with <c>ConnectionStrings__Core</c>.</summary>
        public string Core { get; init; } = string.Empty;
    }
}
