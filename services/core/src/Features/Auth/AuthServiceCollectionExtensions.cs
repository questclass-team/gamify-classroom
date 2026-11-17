using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Configuration;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Login;
using QuestClass.Core.Features.Auth.Logout;
using QuestClass.Core.Features.Auth.Me;
using QuestClass.Core.Features.Auth.Refresh;
using QuestClass.Core.Features.Auth.Shared.Authorization;
using QuestClass.Core.Features.Auth.Shared.Jwt;
using QuestClass.Core.Features.Auth.Shared.Ldap;
using QuestClass.Core.Features.Auth.Shared.RefreshTokens;

namespace QuestClass.Core.Features.Auth
{
    public static class AuthServiceCollectionExtensions
    {
        /// <summary>
        /// LDAP login, JWT access tokens, refresh tokens, role policies (every endpoint needs a token unless it is
        /// marked [AllowAnonymous]), the login rate limit and the Auth handlers.
        /// </summary>
        public static IServiceCollection AddAuthFeature(this IServiceCollection services)
        {
            services.AddLdap();
            services.AddTokens();
            services.AddRolePolicies();
            services.AddLoginRateLimit();

            services
                .AddOptions<BootstrapOptions>()
                .BindConfiguration(BootstrapOptions.SectionName);

            services.AddScoped<LoginHandler>();
            services.AddScoped<GetCurrentUserHandler>();
            services.AddScoped<RefreshHandler>();
            services.AddScoped<LogoutHandler>();

            return services;
        }

        private static void AddLdap(this IServiceCollection services)
        {
            services
                .AddOptions<LdapOptions>()
                .BindConfiguration(LdapOptions.SectionName)
                .ValidateOnStart();

            services.AddSingleton<IValidateOptions<LdapOptions>, LdapOptionsValidator>();
            services.AddSingleton<ILdapAuthenticator, LdapAuthenticator>();
        }

        private static void AddTokens(this IServiceCollection services)
        {
            services
                .AddOptions<JwtOptions>()
                .BindConfiguration(JwtOptions.SectionName)
                .ValidateOnStart();

            services.AddSingleton<IValidateOptions<JwtOptions>, JwtOptionsValidator>();
            services.AddSingleton<IJwtTokenIssuer, JwtTokenIssuer>();

            services
                .AddOptions<RefreshTokenOptions>()
                .BindConfiguration(RefreshTokenOptions.SectionName)
                .ValidateOnStart();

            services.AddSingleton<IValidateOptions<RefreshTokenOptions>, RefreshTokenOptionsValidator>();

            services
                .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    // Keep "sub", "role", "name" exactly as in the token instead of long .NET claim type URIs.
                    options.MapInboundClaims = false;
                });

            services
                .AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
                .Configure<IOptions<JwtOptions>>((bearerOptions, jwtOptions) =>
                {
                    bearerOptions.TokenValidationParameters = JwtValidation.CreateParameters(jwtOptions.Value);
                });
        }

        private static void AddRolePolicies(this IServiceCollection services)
        {
            services.AddAuthorizationBuilder()
                // Secure by default: every endpoint needs a valid token unless it is marked [AllowAnonymous].
                .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
                .AddPolicy(AuthPolicies.Admin, policy => policy.RequireRole(Role.Admin.ToApiName()))
                .AddPolicy(AuthPolicies.Teacher, policy => policy.RequireRole(Role.Teacher.ToApiName()))
                .AddPolicy(AuthPolicies.Student, policy => policy.RequireRole(Role.Student.ToApiName()));
        }

        private static void AddLoginRateLimit(this IServiceCollection services)
        {
            services
                .AddOptions<RateLimitingOptions>()
                .BindConfiguration(RateLimitingOptions.SectionName);

            services.AddRateLimiter(options =>
            {
                // An empty 429 is turned into problem details by UseStatusCodePages.
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

                options.AddPolicy(RateLimitPolicies.Login, httpContext =>
                {
                    var permitsPerMinute = httpContext.RequestServices
                        .GetRequiredService<IOptions<RateLimitingOptions>>()
                        .Value
                        .LoginPermitsPerMinute;

                    // The client address comes from X-Forwarded-For behind nginx (see AddApi).
                    return RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = permitsPerMinute,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0
                        });
                });
            });
        }
    }
}
