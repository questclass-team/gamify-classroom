using QuestClass.Core.Entities;

namespace QuestClass.Core.Repositories
{
    public interface IUserRepository
    {
        /// <summary>Returns the account, or null when it does not exist or is soft-deleted.</summary>
        Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>Returns the account by login in any letter case, or null when it does not exist or is soft-deleted.</summary>
        Task<User?> GetByLoginAsync(string login, CancellationToken cancellationToken = default);

        Task AddAsync(User user, CancellationToken cancellationToken = default);

        /// <summary>Soft-deletes the account: the row stays, it only disappears from queries.</summary>
        Task DeleteAsync(User user, CancellationToken cancellationToken = default);
    }
}
