using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace QuestClass.Core.Common.Persistence
{
    public sealed class CoreDbContext : DbContext
    {
        /// <summary>Every table of this service lives in its own PostgreSQL schema.</summary>
        public const string Schema = "core";

        public CoreDbContext(DbContextOptions<CoreDbContext> options)
            : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.HasDefaultSchema(Schema);

            modelBuilder.ApplyConfigurationsFromAssembly(typeof(CoreDbContext).Assembly);

            ApplySoftDeleteFilters(modelBuilder);
        }

        /// <summary>
        /// Adds the named <see cref="QueryFilters.SoftDelete"/> filter <c>entity => !entity.IsDeleted</c>
        /// to every entity that implements <see cref="ISoftDeletable"/>, so a new entity only has to
        /// implement the interface.
        /// </summary>
        private static void ApplySoftDeleteFilters(ModelBuilder modelBuilder)
        {
            var softDeletableTypes = modelBuilder.Model.GetEntityTypes()
                .Where(entityType => typeof(ISoftDeletable).IsAssignableFrom(entityType.ClrType))
                // EF Core allows query filters only on the root type of an inheritance hierarchy.
                .Where(entityType => entityType.BaseType is null)
                .Select(entityType => entityType.ClrType)
                .ToList();

            foreach (var clrType in softDeletableTypes)
            {
                var entity = Expression.Parameter(clrType, "entity");
                var isNotDeleted = Expression.Not(
                    Expression.Property(entity, nameof(ISoftDeletable.IsDeleted)));

                modelBuilder.Entity(clrType).HasQueryFilter(
                    QueryFilters.SoftDelete,
                    Expression.Lambda(isNotDeleted, entity));
            }
        }
    }
}
