using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Users.Import;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Users.Import
{
    public sealed class ImportUsersHandlerTests
    {
        private const string Header = "login,first_name,last_name,role\n";

        private readonly IUserRepository _users = Substitute.For<IUserRepository>();
        private readonly FakeTimeProvider _timeProvider = new(new DateTimeOffset(2026, 11, 18, 9, 0, 0, TimeSpan.Zero));
        private readonly Dictionary<string, User> _existing = [];
        private IReadOnlyCollection<User> _saved = [];

        public ImportUsersHandlerTests()
        {
            _users.GetByLoginsIncludingDeletedAsync(default!, default)
                .ReturnsForAnyArgs(call => _existing
                    .Where(entry => call.Arg<IReadOnlyCollection<string>>().Contains(entry.Key))
                    .ToDictionary());
            _users.SaveImportAsync(Arg.Do<IReadOnlyCollection<User>>(users => _saved = users), default)
                .ReturnsForAnyArgs(Task.CompletedTask);
        }

        [Fact]
        public async Task HandleAsync_ShouldCreateAccountsAndReportThemInFileOrder()
        {
            var report = await ImportAsync(Header + "JKowalski,Jan,Kowalski,Teacher\nanowak,Anna,Nowak,student\n");

            report.Created.ShouldBe([
                new ImportedUser(2, "jkowalski", "Jan Kowalski", "teacher"),
                new ImportedUser(3, "anowak", "Anna Nowak", "student")
            ]);
            report.Skipped.ShouldBeEmpty();
            _saved.Select(user => (user.Login, user.Role, user.CreatedAt))
                .ShouldBe([("jkowalski", Role.Teacher, _timeProvider.GetUtcNow()), ("anowak", Role.Student, _timeProvider.GetUtcNow())]);
        }

        [Fact]
        public async Task HandleAsync_ShouldSkipEveryKindOfInvalidRowWithItsReason()
        {
            ExistingUser("istniejacy");

            var report = await ImportAsync(Header +
                ",Jan,Kowalski,student\n" +            // 2 no login
                "brakroli,Jan,Kowalski,\n" +           // 3 no role
                "jan kowalski,Jan,Kowalski,student\n" + // 4 space in login
                "superuser,Jan,Kowalski,root\n" +       // 5 unknown role
                "istniejacy,Jan,Kowalski,student\n" +   // 6 already imported
                "nowy,Jan,Kowalski,student\n" +         // 7 ok
                "NOWY,Jan,Kowalski,teacher\n");         // 8 same login again

            report.Skipped.ShouldBe([
                new SkippedImportRow(2, null, ImportSkipReasons.MissingField),
                new SkippedImportRow(3, "brakroli", ImportSkipReasons.MissingField),
                new SkippedImportRow(4, "jan kowalski", ImportSkipReasons.InvalidLogin),
                new SkippedImportRow(5, "superuser", ImportSkipReasons.InvalidRole),
                new SkippedImportRow(6, "istniejacy", ImportSkipReasons.AlreadyExists),
                new SkippedImportRow(8, "nowy", ImportSkipReasons.DuplicateInFile)
            ]);
            report.Created.ShouldHaveSingleItem().Login.ShouldBe("nowy");
        }

        [Fact]
        public async Task HandleAsync_WhenLoginOfExistingAccountRepeats_ShouldReportTheRepeatAsDuplicate()
        {
            ExistingUser("istniejacy");

            var report = await ImportAsync(Header + "istniejacy,A,B,student\nistniejacy,A,B,student\n");

            report.Skipped.Select(row => row.Reason)
                .ShouldBe([ImportSkipReasons.AlreadyExists, ImportSkipReasons.DuplicateInFile]);
        }

        [Fact]
        public async Task HandleAsync_WhenAccountWasDeleted_ShouldRestoreTheSameAccountWithDataFromTheFile()
        {
            var deleted = ExistingUser("jkowalski", Role.Student);
            deleted.IsDeleted = true;
            deleted.DeletedAt = _timeProvider.GetUtcNow().AddDays(-30);

            var report = await ImportAsync(Header + "jkowalski,Jan,Kowalski,teacher\n");

            report.Created.ShouldHaveSingleItem().ShouldBe(new ImportedUser(2, "jkowalski", "Jan Kowalski", "teacher"));
            deleted.IsDeleted.ShouldBeFalse();
            deleted.DeletedAt.ShouldBeNull();
            deleted.Role.ShouldBe(Role.Teacher);
            _saved.ShouldBeEmpty(); // not a new row: the tracked account itself is saved
            await _users.Received(1).SaveImportAsync(Arg.Any<IReadOnlyCollection<User>>(), Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task HandleAsync_ShouldCutOverLongNamesToTheColumnLength()
        {
            var report = await ImportAsync(Header + $"jkowalski,{new string('J', 150)},Kowalski,student\n");

            report.Created.ShouldHaveSingleItem();
            _saved.Single().FirstName.Length.ShouldBe(User.NameMaxLength);
        }

        [Fact]
        public async Task HandleAsync_WhenNothingCanBeImported_ShouldNotTouchTheDatabase()
        {
            var report = await ImportAsync(Header + ",,,\n");

            report.Created.ShouldBeEmpty();
            await _users.DidNotReceiveWithAnyArgs().SaveImportAsync(default!, default);
        }

        [Fact]
        public async Task HandleAsync_ShouldKeepPolishCharactersOfUtf8File()
        {
            var report = await ImportAsync(Header + "mwisniewski,Marek,Wiśniewski,teacher\n");

            report.Created.Single().DisplayName.ShouldBe("Marek Wiśniewski");
        }

        [Fact]
        public async Task HandleAsync_WhenFileIsNotUtf8_ShouldRefuseIt()
        {
            // "Wiśniewski" saved by Excel as Windows-1250: 'ś' is the single byte 0x9C, invalid in UTF-8.
            var bytes = Encoding.ASCII.GetBytes(Header + "mwisniewski,Marek,Wi?niewski,teacher\n");
            bytes[Array.IndexOf(bytes, (byte)'?')] = 0x9C;

            var result = await CreateHandler().HandleAsync(new MemoryStream(bytes));

            result.Error.Type.ShouldBe(ErrorType.Validation);
            result.Error.Code.ShouldBe("Users.ImportNotUtf8");
        }

        [Fact]
        public async Task HandleAsync_WhenHeaderIsWrong_ShouldFail()
        {
            var result = await CreateHandler().HandleAsync(Utf8("jkowalski,Jan,Kowalski,teacher\n"));

            result.Error.Code.ShouldBe("Users.InvalidImportHeader");
        }

        private async Task<UserImportReport> ImportAsync(string csv)
        {
            var result = await CreateHandler().HandleAsync(Utf8(csv));

            result.IsSuccess.ShouldBeTrue();
            return result.Value;
        }

        private ImportUsersHandler CreateHandler()
        {
            return new ImportUsersHandler(_users, _timeProvider, NullLogger<ImportUsersHandler>.Instance);
        }

        private User ExistingUser(string login, Role role = Role.Student)
        {
            var user = new User
            {
                Login = login,
                FirstName = "Old",
                LastName = "Name",
                Role = role,
                CreatedAt = _timeProvider.GetUtcNow().AddYears(-1)
            };
            _existing[login] = user;
            return user;
        }

        private static MemoryStream Utf8(string text)
        {
            return new MemoryStream(Encoding.UTF8.GetBytes(text));
        }
    }
}
