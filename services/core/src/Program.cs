using System.Reflection;
using System.Threading.RateLimiting;
using FluentValidation;
using MicroElements.Swashbuckle.FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Configuration;
using QuestClass.Core.Common.Persistence;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Login;
using QuestClass.Core.Features.Auth.Me;
using QuestClass.Core.Features.Auth.Shared.Authorization;
using QuestClass.Core.Features.Auth.Shared.Ldap;
using QuestClass.Core.Features.Auth.Shared.Tokens;
using QuestClass.Core.Repositories;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Logging
builder.Services.AddSerilog((services, loggerConfiguration) =>
{
    loggerConfiguration
        .ReadFrom.Configuration(builder.Configuration)
        .ReadFrom.Services(services);
});

// Graceful Shutdown
builder.Services.Configure<HostOptions>(options =>
{
    options.ShutdownTimeout = TimeSpan.FromSeconds(20);
});

// Controllers & Validation
builder.Services.AddControllers(options =>
{
    options.Filters.Add<ValidationFilter>();

    // Request rules live only in FluentValidation validators, not in implicit [Required].
    options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
});
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Swagger
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "QuestClass Core API",
        Version = "v1",
        Description = "Identity and groups: LDAP login, JWT, roles, CSV account import, class groups."
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
builder.Services.AddFluentValidationRulesToSwagger();

// Exception Handling
builder.Services.AddProblemDetails(options =>
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
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// Database
builder.Services
    .AddOptions<DatabaseOptions>()
    .BindConfiguration(DatabaseOptions.SectionName)
    .ValidateOnStart();

builder.Services.AddSingleton<IValidateOptions<DatabaseOptions>, DatabaseOptionsValidator>();

builder.Services.AddSingleton<SoftDeleteInterceptor>();

builder.Services.AddDbContext<CoreDbContext>((serviceProvider, options) =>
{
    var databaseOptions = serviceProvider
        .GetRequiredService<IOptions<DatabaseOptions>>()
        .Value;

    options.AddInterceptors(serviceProvider.GetRequiredService<SoftDeleteInterceptor>());

    options
        .UseNpgsql(
            databaseOptions.Core,
            npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", CoreDbContext.Schema);
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(2),
                    errorCodesToAdd: null);
            })
        // Tables and columns as PostgreSQL expects them: users.first_name, not "Users"."FirstName".
        .UseSnakeCaseNamingConvention();
});

// LDAP
builder.Services
    .AddOptions<LdapOptions>()
    .BindConfiguration(LdapOptions.SectionName)
    .ValidateOnStart();

builder.Services.AddSingleton<IValidateOptions<LdapOptions>, LdapOptionsValidator>();
builder.Services.AddSingleton<ILdapAuthenticator, LdapAuthenticator>();

// Authentication (JWT)
builder.Services
    .AddOptions<JwtOptions>()
    .BindConfiguration(JwtOptions.SectionName)
    .ValidateOnStart();

builder.Services.AddSingleton<IValidateOptions<JwtOptions>, JwtOptionsValidator>();
builder.Services.AddSingleton<IJwtTokenIssuer, JwtTokenIssuer>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Keep "sub", "role", "name" exactly as in the token instead of long .NET claim type URIs.
        options.MapInboundClaims = false;
    });

builder.Services
    .AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtOptions>>((bearerOptions, jwtOptions) =>
    {
        bearerOptions.TokenValidationParameters = JwtValidation.CreateParameters(jwtOptions.Value);
    });

// Authorization
builder.Services.AddAuthorizationBuilder()
    // Secure by default: every endpoint needs a valid token unless it is marked [AllowAnonymous].
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
    .AddPolicy(AuthPolicies.Admin, policy => policy.RequireRole(Role.Admin.ToApiName()))
    .AddPolicy(AuthPolicies.Teacher, policy => policy.RequireRole(Role.Teacher.ToApiName()))
    .AddPolicy(AuthPolicies.Student, policy => policy.RequireRole(Role.Student.ToApiName()));

// Auth feature
builder.Services
    .AddOptions<BootstrapOptions>()
    .BindConfiguration(BootstrapOptions.SectionName);

builder.Services.AddScoped<LoginHandler>();
builder.Services.AddScoped<GetCurrentUserHandler>();

// Rate Limiting
builder.Services
    .AddOptions<RateLimitingOptions>()
    .BindConfiguration(RateLimitingOptions.SectionName);

builder.Services.AddRateLimiter(options =>
{
    // An empty 429 is turned into problem details by UseStatusCodePages.
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy(RateLimitPolicies.Login, httpContext =>
    {
        var permitsPerMinute = httpContext.RequestServices
            .GetRequiredService<IOptions<RateLimitingOptions>>()
            .Value
            .LoginPermitsPerMinute;

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

// Behind nginx every request comes from the proxy; the client address is in X-Forwarded-For.
// Any proxy is trusted because the service is reachable only through nginx inside the Docker network.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();

// Health Checks
builder.Services
    .AddHealthChecks()
    .AddDbContextCheck<CoreDbContext>(name: "postgresql", tags: ["ready"]);

// Time Abstraction
builder.Services.AddSingleton(TimeProvider.System);

var app = builder.Build();

// HTTP request pipeline
app.UseForwardedHeaders();

app.UseSerilogRequestLogging();

app.UseExceptionHandler();
app.UseStatusCodePages();

// API docs are served under the same prefix that nginx proxies to this service.
app.UseSwagger(options =>
{
    options.RouteTemplate = "api/core/swagger/{documentName}/swagger.json";
});
app.UseSwaggerUI(options =>
{
    options.RoutePrefix = "api/core/swagger";
    options.SwaggerEndpoint("v1/swagger.json", "QuestClass Core API v1");
    options.DocumentTitle = "QuestClass Core API";
});

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers();

// Liveness: the process is up. Readiness: the database is reachable. Docker probes them without a token.
var livenessCheck = new HealthCheckOptions { Predicate = _ => false };
var readinessCheck = new HealthCheckOptions { Predicate = healthCheck => healthCheck.Tags.Contains("ready") };

app.MapHealthChecks("/health/live", livenessCheck).AllowAnonymous();
app.MapHealthChecks("/health/ready", readinessCheck).AllowAnonymous();

app.Run();

public partial class Program
{
}
