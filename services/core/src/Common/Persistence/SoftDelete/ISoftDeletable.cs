namespace QuestClass.Core.Common.Persistence.SoftDelete
{
    /// <summary>
    /// Marks an entity that is never physically deleted.
    /// Removing it through EF Core only sets <see cref="IsDeleted"/> and <see cref="DeletedAt"/>,
    /// and the <see cref="QueryFilters.SoftDelete"/> filter hides it from every query.
    /// </summary>
    public interface ISoftDeletable
    {
        bool IsDeleted { get; set; }

        DateTimeOffset? DeletedAt { get; set; }
    }
}
