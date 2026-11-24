using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Users.Shared;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Users.UpdateProfile
{
    /// <summary>Sets the calling student's nickname (FR-21), unique across the system ignoring letter case.</summary>
    public sealed class UpdateProfileHandler
    {
        private readonly IUserRepository _userRepository;
        private readonly ILogger<UpdateProfileHandler> _logger;

        public UpdateProfileHandler(IUserRepository userRepository, ILogger<UpdateProfileHandler> logger)
        {
            _userRepository = userRepository;
            _logger = logger;
        }

        public async Task<Result<ProfileResponse>> HandleAsync(
            Guid studentId,
            UpdateProfileRequest request,
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

            var nickname = User.NormalizeNickname(request.Nickname);

            // Saving the same nickname again changes nothing; a change of letter case of one's own nickname is saved.
            if (string.Equals(student.Nickname, nickname, StringComparison.Ordinal))
            {
                return Result<ProfileResponse>.Success(new ProfileResponse(student.Nickname));
            }

            if (!await _userRepository.TrySetNicknameAsync(student, nickname, cancellationToken))
            {
                _logger.LogInformation("Nickname rejected as taken. UserId: {UserId}", student.Id);

                return Result<ProfileResponse>.Failure(ProfileErrors.NicknameTaken());
            }

            _logger.LogInformation("Nickname set. UserId: {UserId}", student.Id);

            return Result<ProfileResponse>.Success(new ProfileResponse(student.Nickname));
        }
    }
}
