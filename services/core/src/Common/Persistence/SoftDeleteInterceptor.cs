using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace QuestClass.Core.Common.Persistence
{
    /// <summary>
    /// Turns <c>Remove(entity)</c> of an <see cref="ISoftDeletable"/> into an UPDATE of
    /// <c>IsDeleted</c> and <c>DeletedAt</c>. Bulk <c>ExecuteDelete</c> bypasses EF Core change tracking
    /// and therefore this interceptor, so it must not be used for soft-deletable entities.
    /// </summary>
    public sealed class SoftDeleteInterceptor : SaveChangesInterceptor
    {
        private readonly TimeProvider _timeProvider;

        public SoftDeleteInterceptor(TimeProvider timeProvider)
        {
            _timeProvider = timeProvider;
        }

        public override InterceptionResult<int> SavingChanges(
            DbContextEventData eventData,
            InterceptionResult<int> result)
        {
            ConvertDeletesToSoftDeletes(eventData.Context);

            return base.SavingChanges(eventData, result);
        }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            ConvertDeletesToSoftDeletes(eventData.Context);

            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }

        private void ConvertDeletesToSoftDeletes(DbContext? context)
        {
            if (context is null)
            {
                return;
            }

            var deletedAt = _timeProvider.GetUtcNow();

            foreach (var entry in context.ChangeTracker.Entries<ISoftDeletable>())
            {
                if (entry.State != EntityState.Deleted)
                {
                    continue;
                }

                // Unchanged first, so that only the two soft delete columns end up in the UPDATE.
                entry.State = EntityState.Unchanged;
                entry.Property(entity => entity.IsDeleted).CurrentValue = true;
                entry.Property(entity => entity.DeletedAt).CurrentValue = deletedAt;
            }
        }
    }
}
