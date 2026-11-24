using FluentValidation;
using QuestClass.Core.Entities;

namespace QuestClass.Core.Features.Users.UpdateAvatar
{
    public sealed class UpdateAvatarValidator : AbstractValidator<UpdateAvatarRequest>
    {
        public UpdateAvatarValidator()
        {
            // Null removes the avatar; anything else must be a key of the ready-made set, exactly as listed.
            RuleFor(request => request.Avatar)
                .Must(avatar => avatar is null || Avatars.IsKnown(avatar))
                .WithMessage($"Avatar must be null or one of: {string.Join(", ", Avatars.Keys)}.");
        }
    }
}
