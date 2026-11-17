using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Students.Search
{
    /// <summary>Finds student accounts for a teacher to add to a group (FR-07: "z listy kont").</summary>
    public sealed class SearchStudentsHandler
    {
        /// <summary>Shorter queries would match most of the accounts.</summary>
        public const int QueryMinLength = 2;

        /// <summary>A picker shows a few names; the teacher types more to narrow them down.</summary>
        public const int MaxResults = 10;

        private readonly IUserRepository _userRepository;

        public SearchStudentsHandler(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<Result<IReadOnlyList<StudentSummaryResponse>>> HandleAsync(
            string? query,
            CancellationToken cancellationToken = default)
        {
            var trimmed = query?.Trim() ?? string.Empty;

            if (trimmed.Length < QueryMinLength)
            {
                return Result<IReadOnlyList<StudentSummaryResponse>>.Success([]);
            }

            var students = await _userRepository.SearchStudentsAsync(trimmed, MaxResults, cancellationToken);

            return Result<IReadOnlyList<StudentSummaryResponse>>.Success(students.Select(ToResponse).ToList());
        }

        private static StudentSummaryResponse ToResponse(User student)
        {
            return new StudentSummaryResponse(student.Id, student.Login, student.DisplayName);
        }
    }
}
