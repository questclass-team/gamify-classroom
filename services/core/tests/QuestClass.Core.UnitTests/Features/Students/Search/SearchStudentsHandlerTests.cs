using NSubstitute;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Students.Search;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Students.Search
{
    public sealed class SearchStudentsHandlerTests
    {
        private readonly IUserRepository _users = Substitute.For<IUserRepository>();
        private readonly SearchStudentsHandler _handler;

        public SearchStudentsHandlerTests()
        {
            _handler = new SearchStudentsHandler(_users);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("k")]
        [InlineData("  k  ")]
        public async Task HandleAsync_WhenQueryIsShorterThanTwoCharacters_ShouldReturnEmptyListWithoutSearching(string? query)
        {
            var result = await _handler.HandleAsync(query);

            result.Value.ShouldBeEmpty();
            await _users.DidNotReceiveWithAnyArgs().SearchStudentsAsync(default!, default);
        }

        [Fact]
        public async Task HandleAsync_ShouldSearchTrimmedQueryWithLimitAndMapStudents()
        {
            var student = new User
            {
                Login = "kwojcik",
                FirstName = "Katarzyna",
                LastName = "Wójcik",
                Role = Role.Student,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _users.SearchStudentsAsync("woj", SearchStudentsHandler.MaxResults, Arg.Any<CancellationToken>())
                .Returns([student]);

            var result = await _handler.HandleAsync("  woj ");

            result.Value.ShouldBe([new StudentSummaryResponse(student.Id, "kwojcik", "Katarzyna Wójcik")]);
        }
    }
}
