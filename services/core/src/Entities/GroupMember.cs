namespace QuestClass.Core.Entities
{
    /// <summary>
    /// A student in a group (FR-07). The key is the pair (group, student): a student can be in many groups, but in
    /// one group only once. Removing a student from a group deletes the row; it is not soft-deleted.
    /// </summary>
    public sealed class GroupMember
    {
        public required Guid GroupId { get; init; }

        public required Guid StudentId { get; init; }

        public required DateTimeOffset AddedAt { get; init; }
    }
}
