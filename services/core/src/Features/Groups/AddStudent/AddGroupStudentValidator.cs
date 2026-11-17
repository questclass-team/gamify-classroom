using FluentValidation;

namespace QuestClass.Core.Features.Groups.AddStudent
{
    public sealed class AddGroupStudentValidator : AbstractValidator<AddGroupStudentRequest>
    {
        public AddGroupStudentValidator()
        {
            // A body without studentId arrives as Guid.Empty.
            RuleFor(request => request.StudentId)
                .NotEmpty()
                .WithMessage("Student id is required.");
        }
    }
}
