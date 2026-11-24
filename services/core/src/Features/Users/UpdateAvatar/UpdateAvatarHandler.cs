using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Users.Shared;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Users.UpdateAvatar
{
    /// <summary>Sets or removes the calling student's avatar, a key of the ready-made set (FR-21).</summary>
    public sealed class UpdateAvatarHandler
    {
        private readonly IUserRepository _userRepository;
        private readonly ILogger<UpdateAvatarHandler> _logger;

        public UpdateAvatarHandler(IUserRepository userRepository, ILogger<UpdateAvatarHandler> logger)
        {
            _userRepository = userRepository;
            _logger = logger;
        }

        /// <remarks><see cref="UpdateAvatarValidator"/> has already checked the key.</remarks>
        public async Task<Result<ProfileResponse>> HandleAsync(
            Guid studentId,
            UpdateAvatarRequest request,
            CancellationToken cancellationToken = default)
        {
            var student = await _userRepository.GetByIdAsync(studentId, cancellationToken);

            if (student is null)
            {
                return Result<ProfileResponse>.Failure(AuthErrors.SessionUserNotFound());
            }

            if (student.Role != Role.Student)
            {
                return Result<ProfileResponse>.Failure(ProfileErrors.StudentOnly());
            }

            // Choosing the current avatar again changes nothing.
            if (!string.Equals(student.Avatar, request.Avatar, StringComparison.Ordinal))
            {
                await _userRepository.SetAvatarAsync(student.Id, request.Avatar, cancellationToken);
                student.Avatar = request.Avatar;

                _logger.LogInformation(
                    "Avatar {Change}. UserId: {UserId}",
                    request.Avatar is null ? "removed" : "set",
                    student.Id);
            }

            return Result<ProfileResponse>.Success(student.ToProfileResponse());
        }
    }
}
