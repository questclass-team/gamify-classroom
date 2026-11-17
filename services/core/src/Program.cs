using System.Reflection;
using FluentValidation;
using MicroElements.Swashbuckle.FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Configuration;
using QuestClass.Core.Common.Persistence;
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
});
builder.Services.AddFluentValidationRulesToSwagger();

// Exception Handling
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Instance ??= context.HttpContext.Request.Path;
    };
});
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// Database
builder.Services
    .AddOptions<DatabaseOptions>()
    .BindConfiguration(DatabaseOptions.SectionName)
    .ValidateOnStart();

builder.Services.AddSingleton<IValidateOptions<DatabaseOptions>, DatabaseOptionsValidator>();

builder.Services.AddDbContext<CoreDbContext>((serviceProvider, options) =>
{
    var databaseOptions = serviceProvider
        .GetRequiredService<IOptions<DatabaseOptions>>()
        .Value;

    options.UseNpgsql(
        databaseOptions.Core,
        npgsqlOptions =>
        {
            npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", CoreDbContext.Schema);
            npgsqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(2),
                errorCodesToAdd: null);
        });
});

// Health Checks
builder.Services
    .AddHealthChecks()
    .AddDbContextCheck<CoreDbContext>(name: "postgresql", tags: ["ready"]);

// Time Abstraction
builder.Services.AddSingleton(TimeProvider.System);

var app = builder.Build();

// HTTP request pipeline
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

app.MapControllers();

// Liveness: the process is up. Readiness: the database is reachable.
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = healthCheck => healthCheck.Tags.Contains("ready")
});

app.Run();

public partial class Program
{
}
