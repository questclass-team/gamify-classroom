using FluentValidation;
using QuestClass.Core.Entities;

namespace QuestClass.Core.Features.Users.UpdateProfile
{
    public sealed class UpdateProfileValidator : AbstractValidator<UpdateProfileRequest>
    {
        public UpdateProfileValidator()
        {
            // The nickname is stored trimmed, so the rules apply to the trimmed value (see User.IsValidNickname).
            RuleFor(request => request.Nickname)
                .Cascade(CascadeMode.Stop)
                .Must(nickname => !string.IsNullOrWhiteSpace(nickname))
                .WithMessage("Nickname is required.")
                .Must(User.IsValidNickname)
                .WithMessage(
                    $"Nickname must have {User.NicknameMinLength} to {User.NicknameMaxLength} characters: letters, " +
                    "digits, spaces, '_', '-' or '.', and must start and end with a letter or digit.");
        }
    }
}
