using FluentValidation;

namespace QuestClass.Core.Features.Students.Search
{
    public sealed class SearchStudentsValidator : AbstractValidator<SearchStudentsRequest>
    {
        /// <summary>Longer than any "First Last" plus login; stops huge query strings.</summary>
        public const int QueryMaxLength = 100;

        public SearchStudentsValidator()
        {
            RuleFor(request => request.Query)
                .MaximumLength(QueryMaxLength)
                .WithMessage($"Query must not exceed {QueryMaxLength} characters.");
        }
    }
}
