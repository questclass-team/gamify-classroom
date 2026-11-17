using FluentValidation;

namespace QuestClass.Core.Features.Users.Import
{
    public sealed class ImportUsersValidator : AbstractValidator<ImportUsersRequest>
    {
        public ImportUsersValidator()
        {
            RuleFor(request => request.File)
                .NotNull()
                .WithMessage(UserImportErrors.MissingFile().Message);
        }
    }
}
