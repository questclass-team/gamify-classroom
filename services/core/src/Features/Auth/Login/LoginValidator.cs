using FluentValidation;
using QuestClass.Core.Entities;

namespace QuestClass.Core.Features.Auth.Login
{
    public sealed class LoginValidator : AbstractValidator<LoginRequest>
    {
        /// <summary>Long enough for any real password, short enough to stop huge payloads.</summary>
        public const int PasswordMaxLength = 256;

        public LoginValidator()
        {
            RuleFor(request => request.Login)
                .Cascade(CascadeMode.Stop)
                .NotEmpty()
                .WithMessage("Login is required.")
                .Must(login => login.Trim().Length <= User.LoginMaxLength)
                .WithMessage($"Login must not exceed {User.LoginMaxLength} characters.")
                // Rejected before reaching the directory: see User.IsValidLogin.
                .Must(User.IsValidLogin)
                .WithMessage("Login may contain only letters, digits, '.', '_' and '-'.");

            RuleFor(request => request.Password)
                .Cascade(CascadeMode.Stop)
                .NotEmpty()
                .WithMessage("Password is required.")
                .MaximumLength(PasswordMaxLength)
                .WithMessage($"Password must not exceed {PasswordMaxLength} characters.");
        }
    }
}
