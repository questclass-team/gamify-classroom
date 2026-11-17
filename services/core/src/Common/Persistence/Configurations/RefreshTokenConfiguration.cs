using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuestClass.Core.Entities;

namespace QuestClass.Core.Common.Persistence.Configurations
{
    public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
    {
        public void Configure(EntityTypeBuilder<RefreshToken> builder)
        {
            builder.ToTable("refresh_tokens");

            builder.HasKey(token => token.Id);

            builder.Property(token => token.Id)
                .ValueGeneratedNever();

            builder.Property(token => token.TokenHash)
                .HasMaxLength(RefreshToken.TokenHashLength)
                .IsFixedLength()
                .IsRequired();

            builder.HasIndex(token => token.TokenHash)
                .IsUnique();

            builder.Property(token => token.CreatedAt)
                .IsRequired();

            builder.Property(token => token.ExpiresAt)
                .IsRequired();

            builder.Property(token => token.RevokedReason)
                .HasConversion<string>()
                .HasMaxLength(32);

            // Users are soft-deleted, so the cascade only matters if a row is ever removed by hand.
            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(token => token.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(token => token.UserId);
        }
    }
}
