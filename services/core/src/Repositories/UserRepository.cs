using Microsoft.EntityFrameworkCore;
using QuestClass.Core.Common.Persistence;
using QuestClass.Core.Entities;

namespace QuestClass.Core.Repositories
{
    public sealed class UserRepository : IUserRepository
    {
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

        public async Task DeleteAsync(User user, CancellationToken cancellationToken = default)
        {
            // Remove + SaveChanges goes through SoftDeleteInterceptor; ExecuteDelete would bypass it.
            _dbContext.Users.Remove(user);

            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
