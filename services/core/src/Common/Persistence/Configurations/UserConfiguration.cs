using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuestClass.Core.Entities;

namespace QuestClass.Core.Common.Persistence.Configurations
{
    public sealed class UserConfiguration : IEntityTypeConfiguration<User>
    {
        /// <summary>
        /// Shadow property of <c>User</c> (column <c>nickname_key</c>): the nickname in lower case, computed by PostgreSQL.
        /// Only its unique index uses it; it is not part of the entity class.
        /// </summary>
        public const string NicknameKeyPropertyName = "NicknameKey";

        /// <summary>Unique index of <c>users.nickname_key</c>; a violation of it means the nickname is taken.</summary>
        public const string NicknameIndexName = "ix_users_nickname_key";

        // lower() under an ICU collation lowers letters of every script ("ŁUCZNIK", "ВОЛК"); under the byte collation
        // of the database it would lower only ASCII letters.
        private const string NicknameKeyColumnSql = $"lower(nickname COLLATE \"{Collations.Unicode}\")";

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

            builder.Property(user => user.Nickname)
                .HasMaxLength(User.NicknameMaxLength);

            // Unique ignoring letter case: the index refuses "cichy lis" next to "Cichy Lis", also when two requests
            // race. NULLs (no nickname yet) never collide. A soft-deleted account keeps its nickname, like its login,
            // because it is restored on re-import.
            builder.Property<string>(NicknameKeyPropertyName)
                .HasComputedColumnSql(NicknameKeyColumnSql, stored: true);

            builder.HasIndex(NicknameKeyPropertyName)
                .IsUnique()
                .HasDatabaseName(NicknameIndexName);

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
