using QuestClass.Core.Common.Results;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Auth.Me
{
    public sealed class GetCurrentUserHandler
    {
        private readonly IUserRepository _userRepository;
        private readonly ILogger<GetCurrentUserHandler> _logger;

        public GetCurrentUserHandler(IUserRepository userRepository, ILogger<GetCurrentUserHandler> logger)
        {
            _userRepository = userRepository;
            _logger = logger;
        }

        /// <summary>
        /// Reads the user from the database, not from the token, so a changed role or a deleted account
        /// is visible immediately.
        /// </summary>
        public async Task<Result<CurrentUserResponse>> HandleAsync(
            Guid userId,
            CancellationToken cancellationToken = default)
        {
            var user = await _userRepository.GetByIdAsync(userId, cancellationToken);

            if (user is null)
            {
                _logger.LogInformation("Session rejected. UserId: {UserId} no longer exists", userId);

                return Result<CurrentUserResponse>.Failure(AuthErrors.SessionUserNotFound());
            }

            return Result<CurrentUserResponse>.Success(user.ToCurrentUserResponse());
        }
    }
}
