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

        /// <summary>
        /// Sets the nickname of the (tracked) account and saves it; false when another account, deleted ones included,
        /// already has it in any letter case (also when a concurrent request took it a moment earlier). On false the
        /// account is left unchanged.
        /// </summary>
        Task<bool> TrySetNicknameAsync(User user, string nickname, CancellationToken cancellationToken = default);

        /// <summary>
        /// Sets only the avatar column of the account (null removes the avatar); other columns, such as a nickname
        /// changed at the same moment, are not touched.
        /// </summary>
        Task SetAvatarAsync(Guid userId, string? avatar, CancellationToken cancellationToken = default);

        /// <summary>Soft-deletes the account: the row stays, it only disappears from queries.</summary>
        Task DeleteAsync(User user, CancellationToken cancellationToken = default);
    }
}
