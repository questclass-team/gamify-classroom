using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Users.Shared;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Users.GetProfile
{
    /// <summary>The calling student's profile (FR-21).</summary>
    public sealed class GetProfileHandler
    {
        private readonly IUserRepository _userRepository;

        public GetProfileHandler(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        /// <summary>Reads the account from the database, so a deleted account or a changed role is seen at once.</summary>
        public async Task<Result<ProfileResponse>> HandleAsync(
            Guid studentId,
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

            return Result<ProfileResponse>.Success(new ProfileResponse(student.Nickname));
        }
    }
}
