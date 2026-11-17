using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuestClass.Core.Entities;

namespace QuestClass.Core.Common.Persistence.Configurations
{
    public sealed class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.ToTable(
                "users",
                tableBuilder =>
                {
                    tableBuilder.HasCheckConstraint(
                        "ck_users_login_lower_case",
                        "login = lower(login)");

                    tableBuilder.HasCheckConstraint(
                        "ck_users_role",
                        "role IN ('student', 'teacher', 'admin')");
                });

            builder.HasKey(user => user.Id);

            builder.Property(user => user.Id)
                .ValueGeneratedNever();

            builder.Property(user => user.Login)
                .HasMaxLength(User.LoginMaxLength)
                .IsRequired();

            // A plain unique index on purpose: a soft-deleted account keeps its login and is restored on re-import.
            builder.HasIndex(user => user.Login)
                .IsUnique();

            builder.Property(user => user.FirstName)
                .HasMaxLength(User.NameMaxLength)
                .IsRequired();

            builder.Property(user => user.LastName)
                .HasMaxLength(User.NameMaxLength)
                .IsRequired();

            // Stored as "student" / "teacher" / "admin", the same values the API uses.
            builder.Property(user => user.Role)
                .HasConversion(
                    role => role.ToApiName(),
                    value => Enum.Parse<Role>(value, true))
                .HasMaxLength(16)
                .IsRequired();

            builder.Property(user => user.CreatedAt)
                .IsRequired();

            // Kept up to date by PostgreSQL on every insert and update (imports, logins, restores).
            builder.Property<string>(SearchText.PropertyName)
                .HasComputedColumnSql(SearchText.ColumnSql, stored: true);

            builder.Property(user => user.IsDeleted)
                .HasDefaultValue(false);
        }
    }
}
