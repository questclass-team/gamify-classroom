using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Login;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Features.Auth.Shared.Ldap;
using QuestClass.Core.Features.Auth.Shared.Tokens;
using QuestClass.Core.Repositories;
using Shouldly;

namespace QuestClass.Core.UnitTests.Features.Auth.Login
{
    public sealed class LoginHandlerTests
    {
        private const string Password = "haslo";

        private readonly ILdapAuthenticator _ldap = Substitute.For<ILdapAuthenticator>();
        private readonly IUserRepository _users = Substitute.For<IUserRepository>();
        private readonly IJwtTokenIssuer _tokens = Substitute.For<IJwtTokenIssuer>();
        private readonly FakeTimeProvider _timeProvider = new(new DateTimeOffset(2026, 11, 18, 9, 0, 0, TimeSpan.Zero));

        public LoginHandlerTests()
        {
            _tokens.Issue(Arg.Any<User>())
                .Returns(new AccessToken("issued-token", _timeProvider.GetUtcNow().AddMinutes(15)));
        }

        [Fact]
        public async Task HandleAsync_WhenDirectoryRejectsPassword_ShouldReturnUnauthorizedWithoutTouchingDatabase()
        {
            _ldap.AuthenticateAsync("student", "wrong", Arg.Any<CancellationToken>()).Returns((LdapUser?)null);

            var result = await CreateHandler().HandleAsync(new LoginRequest("student", "wrong"));

            result.Error.Type.ShouldBe(ErrorType.Unauthorized);
            result.Error.Code.ShouldBe("Auth.InvalidCredentials");
            await _users.DidNotReceiveWithAnyArgs().GetByLoginAsync(default!);
            _tokens.DidNotReceiveWithAnyArgs().Issue(default!);
        }

        [Fact]
        public async Task HandleAsync_WhenAccountWasNotImported_ShouldReturnForbidden()
        {
            DirectoryAccepts("nowy", new LdapUser("Nowy", "Użytkownik"));

            var result = await CreateHandler().HandleAsync(new LoginRequest("nowy", Password));

            result.Error.Type.ShouldBe(ErrorType.Forbidden);
            result.Error.Code.ShouldBe("Auth.AccountNotImported");
            await _users.DidNotReceiveWithAnyArgs().AddAsync(default!);
            _tokens.DidNotReceiveWithAnyArgs().Issue(default!);
        }

        [Fact]
        public async Task HandleAsync_WhenUserIsImported_ShouldReturnTokenAndUser()
        {
            var user = ImportedUser("nauczyciel", Role.Teacher);
            DirectoryAccepts("nauczyciel", new LdapUser("Jan", "Kowalski"));
            _users.GetByLoginAsync("nauczyciel", Arg.Any<CancellationToken>()).Returns(user);

            var result = await CreateHandler().HandleAsync(new LoginRequest("nauczyciel", Password));

            result.IsSuccess.ShouldBeTrue();
            result.Value.AccessToken.ShouldBe("issued-token");
            result.Value.User.ShouldBe(new CurrentUserResponse(user.Id, "nauczyciel", "Jan Kowalski", "teacher"));
        }

        [Fact]
        public async Task HandleAsync_ShouldNormalizeLoginBeforeAskingTheDirectory()
        {
            DirectoryAccepts("student", new LdapUser("Ewa", "Nowak"));
            _users.GetByLoginAsync("student", Arg.Any<CancellationToken>()).Returns(ImportedUser("student"));

            var result = await CreateHandler().HandleAsync(new LoginRequest("  Student ", Password));

            result.IsSuccess.ShouldBeTrue();
            await _ldap.Received(1).AuthenticateAsync("student", Password, Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task HandleAsync_ShouldUpdateNamesFromDirectoryAndLastLoginTime()
        {
            var user = ImportedUser("mwisniewski", firstName: "Marek", lastName: "Wisniewski");
            DirectoryAccepts("mwisniewski", new LdapUser("Marek", "Wiśniewski"));
            _users.GetByLoginAsync("mwisniewski", Arg.Any<CancellationToken>()).Returns(user);

            await CreateHandler().HandleAsync(new LoginRequest("mwisniewski", Password));

            user.LastName.ShouldBe("Wiśniewski");
            user.LastLoginAt.ShouldBe(_timeProvider.GetUtcNow());
            await _users.Received(1).UpdateAsync(user, Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task HandleAsync_WhenDirectoryHasNoNames_ShouldKeepImportedNames()
        {
            var user = ImportedUser("student", firstName: "Ewa", lastName: "Nowak");
            DirectoryAccepts("student", new LdapUser(null, "  "));
            _users.GetByLoginAsync("student", Arg.Any<CancellationToken>()).Returns(user);

            await CreateHandler().HandleAsync(new LoginRequest("student", Password));

            user.FirstName.ShouldBe("Ewa");
            user.LastName.ShouldBe("Nowak");
        }

        [Fact]
        public async Task HandleAsync_WhenBootstrapAdminLogsInFirstTime_ShouldCreateAdmin()
        {
            DirectoryAccepts("admin", new LdapUser("Anna", "Administratorka"));

            var result = await CreateHandler(bootstrapAdmins: "admin").HandleAsync(new LoginRequest("admin", Password));

            result.IsSuccess.ShouldBeTrue();
            result.Value.User.Role.ShouldBe("admin");
            result.Value.User.DisplayName.ShouldBe("Anna Administratorka");
            await _users.Received(1).AddAsync(
                Arg.Is<User>(user => user.Login == "admin" && user.Role == Role.Admin),
                Arg.Any<CancellationToken>());
        }

        [Fact]
        public async Task HandleAsync_WhenBootstrapAdminAccountWasDeleted_ShouldReturnForbidden()
        {
            DirectoryAccepts("admin", new LdapUser("Anna", "Administratorka"));
            _users.ExistsIncludingDeletedAsync("admin", Arg.Any<CancellationToken>()).Returns(true);

            var result = await CreateHandler(bootstrapAdmins: "admin").HandleAsync(new LoginRequest("admin", Password));

            result.Error.Type.ShouldBe(ErrorType.Forbidden);
            await _users.DidNotReceiveWithAnyArgs().AddAsync(default!);
        }

        [Fact]
        public async Task HandleAsync_WhenBootstrapAdminAlreadyExists_ShouldKeepItsRole()
        {
            // The database is the source of truth: an imported "admin" login that is a student stays a student.
            DirectoryAccepts("admin", new LdapUser("Anna", "Administratorka"));
            _users.GetByLoginAsync("admin", Arg.Any<CancellationToken>()).Returns(ImportedUser("admin", Role.Student));

            var result = await CreateHandler(bootstrapAdmins: "admin").HandleAsync(new LoginRequest("admin", Password));

            result.Value.User.Role.ShouldBe("student");
            await _users.DidNotReceiveWithAnyArgs().AddAsync(default!);
        }

        private LoginHandler CreateHandler(string bootstrapAdmins = "")
        {
            return new LoginHandler(
                _ldap,
                _users,
                _tokens,
                Options.Create(new BootstrapOptions { AdminLogins = bootstrapAdmins }),
                _timeProvider,
                NullLogger<LoginHandler>.Instance);
        }

        private void DirectoryAccepts(string login, LdapUser directoryUser)
        {
            _ldap.AuthenticateAsync(login, Password, Arg.Any<CancellationToken>()).Returns(directoryUser);
        }

        private static User ImportedUser(
            string login,
            Role role = Role.Student,
            string firstName = "Ewa",
            string lastName = "Nowak")
        {
            return new User
            {
                Login = login,
                FirstName = firstName,
                LastName = lastName,
                Role = role,
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-7)
            };
        }
    }
}
