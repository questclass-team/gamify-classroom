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
        }
    }
}
