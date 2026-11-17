using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace QuestClass.Core.Common.Api
{
    /// <summary>
    /// Marks every endpoint except [AllowAnonymous] ones as requiring the bearer token in Swagger,
    /// matching the fallback authorization policy.
    /// </summary>
    public sealed class AuthorizeOperationFilter : IOperationFilter
    {
        public const string SchemeName = "Bearer";

        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            var isAnonymous = context.ApiDescription.ActionDescriptor.EndpointMetadata
                .OfType<IAllowAnonymous>()
                .Any();

            if (isAnonymous)
            {
                return;
            }

            operation.Security ??= [];
            operation.Security.Add(new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference(SchemeName, context.Document)] = []
            });
        }
    }
}
