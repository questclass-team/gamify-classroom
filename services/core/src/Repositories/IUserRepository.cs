using QuestClass.Core.Entities;

namespace QuestClass.Core.Repositories
{
    public interface IUserRepository
    {
        /// <summary>Returns the account, or null when it does not exist or is soft-deleted.</summary>
        Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>Returns the account by login in any letter case, or null when it does not exist or is soft-deleted.</summary>
        Task<User?> GetByLoginAsync(string login, CancellationToken cancellationToken = default);

        /// <summary>
        /// Student accounts whose login or "First Last" contains <paramref name="query"/>, ignoring letter case and
        /// Polish diacritics, in Polish alphabetical order of their names; at most <paramref name="limit"/>.
        /// </summary>
        Task<IReadOnlyList<User>> SearchStudentsAsync(string query, int limit, CancellationToken cancellationToken = default);

        /// <summary>True when the login was ever used, including soft-deleted accounts.</summary>
        Task<bool> ExistsIncludingDeletedAsync(string login, CancellationToken cancellationToken = default);

        /// <summary>
        /// Accounts with any of these (normalized) logins, soft-deleted ones included, keyed by login. They are
        /// tracked: changes to them are saved by <see cref="SaveImportAsync"/>.
        /// </summary>
        Task<IReadOnlyDictionary<string, User>> GetByLoginsIncludingDeletedAsync(
            IReadOnlyCollection<string> logins,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Adds the new accounts and saves changes to tracked ones (restored accounts) in a single transaction.
        /// </summary>
        Task SaveImportAsync(IReadOnlyCollection<User> newUsers, CancellationToken cancellationToken = default);

        Task AddAsync(User user, CancellationToken cancellationToken = default);

        Task UpdateAsync(User user, CancellationToken cancellationToken = default);

        /// <summary>Soft-deletes the account: the row stays, it only disappears from queries.</summary>
        Task DeleteAsync(User user, CancellationToken cancellationToken = default);
    }
}
