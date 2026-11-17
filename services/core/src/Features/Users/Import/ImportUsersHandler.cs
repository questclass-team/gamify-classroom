using System.Text;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Users.Import
{
    /// <summary>
    /// Creates accounts from the CSV file (FR-04). Existing accounts are never created again; an account that was
    /// deleted is restored (same id, so its history in the game service comes back). The whole file is saved in
    /// one transaction.
    /// </summary>
    public sealed class ImportUsersHandler
    {
        /// <summary>About 20 000 accounts; a faculty needs far less.</summary>
        public const long MaxFileBytes = 1024 * 1024;

        private static readonly UTF8Encoding _strictUtf8 = new(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);

        private readonly IUserRepository _userRepository;
        private readonly TimeProvider _timeProvider;
        private readonly ILogger<ImportUsersHandler> _logger;

        public ImportUsersHandler(
            IUserRepository userRepository,
            TimeProvider timeProvider,
            ILogger<ImportUsersHandler> logger)
        {
            _userRepository = userRepository;
            _timeProvider = timeProvider;
            _logger = logger;
        }

        public async Task<Result<UserImportReport>> HandleAsync(
            Stream file,
            CancellationToken cancellationToken = default)
        {
            var text = await ReadUtf8Async(file, cancellationToken);

            if (text is null)
            {
                return Result<UserImportReport>.Failure(UserImportErrors.NotUtf8());
            }

            var parsed = UserCsvParser.Parse(text);

            if (parsed.IsFailure)
            {
                return Result<UserImportReport>.Failure(parsed.Error);
            }

            var created = new List<ImportedUser>();
            var skipped = new List<SkippedImportRow>();
            var candidates = new List<Candidate>();

            // 1. Checks that need only the row itself.
            foreach (var row in parsed.Value)
            {
                var candidate = Validate(row, out var skip);

                if (candidate is null)
                {
                    skipped.Add(skip!);
                }
                else
                {
                    candidates.Add(candidate);
                }
            }

            // 2. Checks against the file and the database: one query for all logins.
            var existing = await _userRepository.GetByLoginsIncludingDeletedAsync(
                candidates.Select(candidate => candidate.Login).ToList(),
                cancellationToken);

            var now = _timeProvider.GetUtcNow();
            var seenInFile = new HashSet<string>();
            var newUsers = new List<User>();
            var restored = 0;

            foreach (var candidate in candidates)
            {
                if (!seenInFile.Add(candidate.Login))
                {
                    skipped.Add(new SkippedImportRow(candidate.Line, candidate.Login, ImportSkipReasons.DuplicateInFile));
                    continue;
                }

                if (existing.TryGetValue(candidate.Login, out var user))
                {
                    if (!user.IsDeleted)
                    {
                        skipped.Add(new SkippedImportRow(candidate.Line, candidate.Login, ImportSkipReasons.AlreadyExists));
                        continue;
                    }

                    Restore(user, candidate);
                    restored++;
                }
                else
                {
                    user = new User
                    {
                        Login = candidate.Login,
                        FirstName = candidate.FirstName,
                        LastName = candidate.LastName,
                        Role = candidate.Role,
                        CreatedAt = now
                    };
                    newUsers.Add(user);
                }

                created.Add(new ImportedUser(
                    candidate.Line,
                    user.Login,
                    $"{user.FirstName} {user.LastName}",
                    user.Role.ToApiName()));
            }

            if (created.Count > 0)
            {
                await _userRepository.SaveImportAsync(newUsers, cancellationToken);
            }

            _logger.LogInformation(
                "Accounts imported. Created: {Created} (of them restored: {Restored}), skipped: {Skipped}",
                created.Count,
                restored,
                skipped.Count);

            return Result<UserImportReport>.Success(new UserImportReport(
                created,
                skipped.OrderBy(row => row.Line).ToList()));
        }

        private static Candidate? Validate(UserCsvRow row, out SkippedImportRow? skip)
        {
            var login = User.NormalizeLogin(row.Login);
            skip = null;

            if (login.Length == 0 || row.FirstName.Length == 0 || row.LastName.Length == 0 || row.Role.Length == 0)
            {
                skip = new SkippedImportRow(row.Line, login.Length == 0 ? null : login, ImportSkipReasons.MissingField);
                return null;
            }

            if (!User.IsValidLogin(login))
            {
                skip = new SkippedImportRow(row.Line, login, ImportSkipReasons.InvalidLogin);
                return null;
            }

            if (!RoleExtensions.TryParseApiName(row.Role, out var role))
            {
                skip = new SkippedImportRow(row.Line, login, ImportSkipReasons.InvalidRole);
                return null;
            }

            return new Candidate(row.Line, login, Shorten(row.FirstName), Shorten(row.LastName), role);
        }

        /// <summary>
        /// The CSV decides the restored account's names and role, like a new import. The same row keeps its id.
        /// </summary>
        private static void Restore(User user, Candidate candidate)
        {
            user.IsDeleted = false;
            user.DeletedAt = null;
            user.FirstName = candidate.FirstName;
            user.LastName = candidate.LastName;
            user.Role = candidate.Role;
        }

        /// <summary>Names are refreshed from LDAP on login anyway; an over-long CSV value is cut to the column.</summary>
        private static string Shorten(string name)
        {
            return name.Length <= User.NameMaxLength ? name : name[..User.NameMaxLength];
        }

        private static async Task<string?> ReadUtf8Async(Stream file, CancellationToken cancellationToken)
        {
            using var buffer = new MemoryStream();
            await file.CopyToAsync(buffer, cancellationToken);

            try
            {
                return _strictUtf8.GetString(buffer.GetBuffer(), 0, (int)buffer.Length);
            }
            catch (DecoderFallbackException)
            {
                return null;
            }
        }

        private sealed record Candidate(int Line, string Login, string FirstName, string LastName, Role Role);
    }
}
