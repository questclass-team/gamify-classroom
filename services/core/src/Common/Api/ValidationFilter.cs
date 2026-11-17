using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace QuestClass.Core.Common.Api
{
    public sealed class ValidationFilter : IAsyncActionFilter
    {
        private readonly ProblemDetailsFactory _problemDetailsFactory;
        private readonly ILogger<ValidationFilter> _logger;

        public ValidationFilter(
            ProblemDetailsFactory problemDetailsFactory,
            ILogger<ValidationFilter> logger)
        {
            _problemDetailsFactory = problemDetailsFactory;
            _logger = logger;
        }

        public async Task OnActionExecutionAsync(
            ActionExecutingContext context,
            ActionExecutionDelegate next)
        {
            var modelState = new ModelStateDictionary();

            foreach (var argument in context.ActionArguments.Values)
            {
                if (argument is null)
                {
                    continue;
                }

                var argumentType = argument.GetType();

                if (argumentType.IsValueType || argumentType == typeof(string))
                {
                    continue;
                }

                var validatorType = typeof(IValidator<>).MakeGenericType(argumentType);

                if (context.HttpContext.RequestServices.GetService(validatorType) is not IValidator validator)
                {
                    continue;
                }

                var validationResult = await validator.ValidateAsync(
                    new ValidationContext<object>(argument),
                    context.HttpContext.RequestAborted);

                foreach (var failure in validationResult.Errors)
                {
                    modelState.AddModelError(failure.PropertyName, failure.ErrorMessage);
                }
            }

            if (modelState.IsValid)
            {
                await next();
                return;
            }

            _logger.LogInformation(
                "Validation failed for {Method} {Path}",
                context.HttpContext.Request.Method,
                context.HttpContext.Request.Path);

            var problemDetails = _problemDetailsFactory.CreateValidationProblemDetails(
                context.HttpContext,
                modelState,
                statusCode: StatusCodes.Status400BadRequest,
                title: "Validation Failed",
                detail: "One or more validation errors occurred.");

            context.Result = new BadRequestObjectResult(problemDetails);
        }
    }
}
