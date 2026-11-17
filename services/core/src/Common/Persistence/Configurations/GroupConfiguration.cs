using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuestClass.Core.Entities;

namespace QuestClass.Core.Common.Persistence.Configurations
{
    public sealed class GroupConfiguration : IEntityTypeConfiguration<Group>
    {
        public void Configure(EntityTypeBuilder<Group> builder)
        {
            builder.ToTable(
                "groups",
                tableBuilder =>
                {
                    tableBuilder.HasCheckConstraint(
                        "ck_groups_name_not_blank",
                        "btrim(name) <> ''");
                });

            builder.HasKey(group => group.Id);

            builder.Property(group => group.Id)
                .ValueGeneratedNever();

            builder.Property(group => group.Name)
                .HasMaxLength(Group.NameMaxLength)
                .IsRequired();

            // Restrict: users are soft-deleted, a teacher row is never removed while it still has groups.
            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(group => group.TeacherId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(group => group.TeacherId);

            builder.Property(group => group.CreatedAt)
                .IsRequired();

            builder.Property(group => group.IsDeleted)
                .HasDefaultValue(false);
        }
    }
}
