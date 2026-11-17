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

// Controllers
builder.Services.AddControllers();

// Time Abstraction
builder.Services.AddSingleton(TimeProvider.System);

var app = builder.Build();

// HTTP request pipeline
app.UseSerilogRequestLogging();

app.MapControllers();

app.Run();

public partial class Program
{
}
