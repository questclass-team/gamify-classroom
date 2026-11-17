using FluentValidation;
using QuestClass.Core.Entities;

namespace QuestClass.Core.Features.Groups.Create
{
    public sealed class CreateGroupValidator : AbstractValidator<CreateGroupRequest>
    {
        public CreateGroupValidator()
        {
            // The name is stored trimmed, so the limits apply to the trimmed value.
            RuleFor(request => request.Name)
                .Cascade(CascadeMode.Stop)
                .Must(name => !string.IsNullOrWhiteSpace(name))
                .WithMessage("Group name is required.")
                .Must(name => name.Trim().Length <= Group.NameMaxLength)
                .WithMessage($"Group name must not exceed {Group.NameMaxLength} characters.");
        }
    }
}
