using System.Reflection;
using FluentValidation;
using MicroElements.Swashbuckle.FluentValidation.AspNetCore;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.OpenApi;

namespace QuestClass.Core.Common.Api
{
    public static class ApiServiceCollectionExtensions
    {
        /// <summary>
        /// Controllers with FluentValidation, the OpenAPI document, RFC 9457 problem details for every error and the
        /// client address from nginx.
        /// </summary>
        public static IServiceCollection AddApi(this IServiceCollection services)
        {
            services.AddControllers(options =>
            {
                options.Filters.Add<ValidationFilter>();

                // Request rules live only in FluentValidation validators, not in implicit [Required].
                options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
            });
            services.AddValidatorsFromAssemblyContaining<ValidationFilter>();

            services.AddSwagger();
            services.AddProblemDetailsForEveryError();

            // Behind nginx every request comes from the proxy; the client address is in X-Forwarded-For.
            // Any proxy is trusted because the service is reachable only through nginx inside the Docker network.
            services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                options.ForwardLimit = 1;
                options.KnownIPNetworks.Clear();
                options.KnownProxies.Clear();
            });

            return services;
        }

        private static void AddSwagger(this IServiceCollection services)
        {
            services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "QuestClass Core API",
                    Version = "v1",
                    Description = "Identity and groups: LDAP login, JWT, roles, CSV account import, class groups, " +
                        "student profiles (nickname)."
                });

                var xmlDocumentPath = Path.Combine(
                    AppContext.BaseDirectory,
                    $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
                options.IncludeXmlComments(xmlDocumentPath);

                // "Authorize" button: paste the accessToken from POST /api/core/auth/login.
                options.AddSecurityDefinition(AuthorizeOperationFilter.SchemeName, new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "Access token from POST /api/core/auth/login."
                });
                options.OperationFilter<AuthorizeOperationFilter>();
            });
            services.AddFluentValidationRulesToSwagger();
        }

        private static void AddProblemDetailsForEveryError(this IServiceCollection services)
        {
            services.AddProblemDetails(options =>
            {
                options.CustomizeProblemDetails = context =>
                {
                    context.ProblemDetails.Instance ??= context.HttpContext.Request.Path;

                    // ASP.NET Core has default titles only for some codes (none for 429); use the HTTP reason phrase.
                    if (string.IsNullOrEmpty(context.ProblemDetails.Title))
                    {
                        var statusCode = context.ProblemDetails.Status ?? context.HttpContext.Response.StatusCode;
                        context.ProblemDetails.Title = ReasonPhrases.GetReasonPhrase(statusCode);
                    }
                };
            });
            services.AddExceptionHandler<GlobalExceptionHandler>();
        }
    }
}
