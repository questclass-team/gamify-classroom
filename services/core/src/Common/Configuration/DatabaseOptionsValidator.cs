using Microsoft.Extensions.Options;
using Npgsql;

namespace QuestClass.Core.Common.Configuration
{
    public sealed class DatabaseOptionsValidator : IValidateOptions<DatabaseOptions>
    {
        private const string SettingName = "ConnectionStrings:Core";

        public ValidateOptionsResult Validate(string? name, DatabaseOptions options)
        {
            if (string.IsNullOrWhiteSpace(options.Core))
            {
                return ValidateOptionsResult.Fail(
                    $"Configuration value '{SettingName}' is required.");
            }

            try
            {
                var connectionStringBuilder = new NpgsqlConnectionStringBuilder(options.Core);

                if (string.IsNullOrWhiteSpace(connectionStringBuilder.Host) ||
                    string.IsNullOrWhiteSpace(connectionStringBuilder.Database) ||
                    string.IsNullOrWhiteSpace(connectionStringBuilder.Username))
                {
                    return ValidateOptionsResult.Fail(
                        $"Configuration value '{SettingName}' must contain Host, Database and Username.");
                }
            }
            catch (ArgumentException)
            {
                return ValidateOptionsResult.Fail(
                    $"Configuration value '{SettingName}' must be a valid PostgreSQL connection string.");
            }

            return ValidateOptionsResult.Success;
        }
    }
}
