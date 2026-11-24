using Microsoft.EntityFrameworkCore;
using Npgsql;
using QuestClass.Core.Common.Persistence;
using QuestClass.Core.Common.Persistence.Configurations;
using QuestClass.Core.Common.Persistence.SoftDelete;
using QuestClass.Core.Entities;

namespace QuestClass.Core.Repositories
{
    public sealed class UserRepository : IUserRepository
    {
        private const string LikeEscape = "\\";

        private readonly CoreDbContext _dbContext;

        public UserRepository(CoreDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return _dbContext.Users
                .SingleOrDefaultAsync(user => user.Id == id, cancellationToken);
        }

        public Task<User?> GetByLoginAsync(string login, CancellationToken cancellationToken = default)
        {
            var normalizedLogin = User.NormalizeLogin(login);

            return _dbContext.Users
                .SingleOrDefaultAsync(user => user.Login == normalizedLogin, cancellationToken);
        }

        public async Task<IReadOnlyList<User>> SearchStudentsAsync(
            string query,
            int limit,
            CancellationToken cancellationToken = default)
        {
            // % and _ typed by the user are matched literally, not as wildcards.
            var pattern = $"%{EscapeLikePattern(SearchText.Fold(query.Trim()))}%";

            return await _dbContext.Users
                .AsNoTracking()
                .Where(user => user.Role == Role.Student)
                .Where(user => EF.Functions.Like(EF.Property<string>(user, SearchText.PropertyName), pattern, LikeEscape))
                .OrderBy(user => EF.Functions.Collate(user.FirstName, Collations.Polish))
                .ThenBy(user => EF.Functions.Collate(user.LastName, Collations.Polish))
                .ThenBy(user => user.Login)
                .Take(limit)
                .ToListAsync(cancellationToken);
        }

        public Task<bool> ExistsIncludingDeletedAsync(string login, CancellationToken cancellationToken = default)
        {
            var normalizedLogin = User.NormalizeLogin(login);

            return _dbContext.Users
                .IgnoreQueryFilters([QueryFilters.SoftDelete])
                .AnyAsync(user => user.Login == normalizedLogin, cancellationToken);
        }

        public async Task<IReadOnlyDictionary<string, User>> GetByLoginsIncludingDeletedAsync(
            IReadOnlyCollection<string> logins,
            CancellationToken cancellationToken = default)
        {
            var normalizedLogins = logins.Select(User.NormalizeLogin).Distinct().ToList();

            var users = await _dbContext.Users
                .IgnoreQueryFilters([QueryFilters.SoftDelete])
                .Where(user => normalizedLogins.Contains(user.Login))
                .ToListAsync(cancellationToken);

            return users.ToDictionary(user => user.Login);
        }

        public async Task SaveImportAsync(IReadOnlyCollection<User> newUsers, CancellationToken cancellationToken = default)
        {
            // One SaveChanges is one transaction: the whole file is imported, or nothing.
            _dbContext.Users.AddRange(newUsers);

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task AddAsync(User user, CancellationToken cancellationToken = default)
        {
            _dbContext.Users.Add(user);

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task UpdateAsync(User user, CancellationToken cancellationToken = default)
        {
            _dbContext.Users.Update(user);

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        public async Task<bool> TrySetNicknameAsync(User user, string nickname, CancellationToken cancellationToken = default)
        {
            var previousNickname = user.Nickname;
            user.Nickname = nickname;
            _dbContext.Users.Update(user);

            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
                return true;
            }
            catch (DbUpdateException exception)
                when (exception.InnerException is PostgresException
                {
                    SqlState: PostgresErrorCodes.UniqueViolation,
                    ConstraintName: UserConfiguration.NicknameIndexName
                })
            {
                // The case-insensitive unique index is the only check, so two requests racing for one nickname
                // cannot both win.
                user.Nickname = previousNickname;
                _dbContext.Entry(user).State = EntityState.Unchanged;
                return false;
            }
        }

        public async Task DeleteAsync(User user, CancellationToken cancellationToken = default)
        {
            // Remove + SaveChanges goes through SoftDeleteInterceptor; ExecuteDelete would bypass it.
            _dbContext.Users.Remove(user);

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        private static string EscapeLikePattern(string value)
        {
            return value
                .Replace(LikeEscape, LikeEscape + LikeEscape)
                .Replace("%", LikeEscape + "%")
                .Replace("_", LikeEscape + "_");
        }
    }
}
