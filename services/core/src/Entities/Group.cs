using QuestClass.Core.Common.Persistence;

namespace QuestClass.Core.Entities
{
    /// <summary>
    /// A class group of one teacher (FR-06). Its students are <see cref="GroupMember"/> rows. The game service
    /// keeps its configuration (currency, ranks) under the same id.
    /// </summary>
    public sealed class Group : ISoftDeletable
    {
        public const int NameMaxLength = 100;

        public Guid Id { get; init; } = Guid.CreateVersion7();

        /// <summary>Trimmed, 1 to <see cref="NameMaxLength"/> characters. Need not be unique.</summary>
        public required string Name { get; set; }

        /// <summary>The only teacher who can see and change the group.</summary>
        public required Guid TeacherId { get; init; }

        public required DateTimeOffset CreatedAt { get; init; }

        public bool IsDeleted { get; set; }

        public DateTimeOffset? DeletedAt { get; set; }
    }
}
