using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuestClass.Core.Entities;

namespace QuestClass.Core.Common.Persistence.Configurations
{
    public sealed class GroupMemberConfiguration : IEntityTypeConfiguration<GroupMember>
    {
        public void Configure(EntityTypeBuilder<GroupMember> builder)
        {
            builder.ToTable("group_members");

            // The pair is the key, so the database itself refuses a second membership of the same student.
            builder.HasKey(member => new { member.GroupId, member.StudentId });

            // Groups and users are soft-deleted, so the cascades only matter if a row is ever removed by hand.
            builder.HasOne<Group>()
                .WithMany()
                .HasForeignKey(member => member.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(member => member.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            // "Groups of a student" (student views, the game service); the key covers lookups by group.
            builder.HasIndex(member => member.StudentId);

            builder.Property(member => member.AddedAt)
                .IsRequired();
        }
    }
}
