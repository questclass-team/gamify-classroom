using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using QuestClass.Core.Common.Api;
using QuestClass.Core.Common.Persistence;
using QuestClass.Core.Features.Auth;
using QuestClass.Core.Features.Groups;
using QuestClass.Core.Features.Students;
using QuestClass.Core.Features.Users;
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

// Time Abstraction
builder.Services.AddSingleton(TimeProvider.System);

// Each area registers its own services: Common/* for the infrastructure, Features/<Feature> for the slices.
builder.Services
    .AddApi()
    .AddPersistence()
    .AddAuthFeature()
    .AddUsersFeature()
    .AddGroupsFeature()
    .AddStudentsFeature();

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
