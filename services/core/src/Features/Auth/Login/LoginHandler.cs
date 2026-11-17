using Microsoft.Extensions.Options;
using QuestClass.Core.Common.Results;
using QuestClass.Core.Entities;
using QuestClass.Core.Features.Auth.Shared;
using QuestClass.Core.Repositories;

namespace QuestClass.Core.Features.Auth.Login
{
    public sealed class LoginHandler
    {
        private readonly ILdapAuthenticator _ldapAuthenticator;
        private readonly IUserRepository _userRepository;
        private readonly IJwtTokenIssuer _tokenIssuer;
        private readonly BootstrapOptions _bootstrapOptions;
        private readonly TimeProvider _timeProvider;
        private readonly ILogger<LoginHandler> _logger;

        public LoginHandler(
            ILdapAuthenticator ldapAuthenticator,
            IUserRepository userRepository,
            IJwtTokenIssuer tokenIssuer,
            IOptions<BootstrapOptions> bootstrapOptions,
            TimeProvider timeProvider,
            ILogger<LoginHandler> logger)
        {
            _ldapAuthenticator = ldapAuthenticator;
            _userRepository = userRepository;
            _tokenIssuer = tokenIssuer;
            _bootstrapOptions = bootstrapOptions.Value;
            _timeProvider = timeProvider;
            _logger = logger;
        }

        public async Task<Result<LoginResponse>> HandleAsync(
            LoginRequest request,
            CancellationToken cancellationToken = default)
        {
            var login = User.NormalizeLogin(request.Login);

            // 1. The directory checks the password.
            var directoryUser = await _ldapAuthenticator.AuthenticateAsync(login, request.Password, cancellationToken);

            if (directoryUser is null)
            {
                _logger.LogInformation("Login rejected. Login: {Login}, reason: invalid credentials", login);

                return Result<LoginResponse>.Failure(AuthErrors.InvalidCredentials());
            }

            var now = _timeProvider.GetUtcNow();

            // 2. Only accounts imported from CSV may use the system.
            var user = await _userRepository.GetByLoginAsync(login, cancellationToken);

            if (user is null)
            {
                if (!await CanBootstrapAdminAsync(login, cancellationToken))
                {
                    _logger.LogInformation("Login rejected. Login: {Login}, reason: account not imported", login);

                    return Result<LoginResponse>.Failure(AuthErrors.AccountNotImported());
                }

                user = CreateBootstrapAdmin(login, directoryUser, now);
                await _userRepository.AddAsync(user, cancellationToken);

                _logger.LogWarning("Bootstrap admin created. UserId: {UserId}, Login: {Login}", user.Id, login);
            }
            else
            {
                // 3. FR-02: the directory is the source of truth for names.
                ApplyDirectoryNames(user, directoryUser);
                user.LastLoginAt = now;
                await _userRepository.UpdateAsync(user, cancellationToken);
            }

            // 4. Access token with the role from our database (LDAP knows nothing about roles).
            var accessToken = _tokenIssuer.Issue(user);

            _logger.LogInformation("User logged in. UserId: {UserId}, Role: {Role}", user.Id, user.Role.ToApiName());

            return Result<LoginResponse>.Success(ToResponse(user, accessToken));
        }

        /// <summary>
        /// Only a login that has never existed: a deleted account must not come back through this shortcut.
        /// </summary>
        private async Task<bool> CanBootstrapAdminAsync(string login, CancellationToken cancellationToken)
        {
            return _bootstrapOptions.IsBootstrapAdmin(login)
                && !await _userRepository.ExistsIncludingDeletedAsync(login, cancellationToken);
        }

        private static User CreateBootstrapAdmin(string login, LdapUser directoryUser, DateTimeOffset now)
        {
            return new User
            {
                Login = login,
                FirstName = NonEmptyOrDefault(directoryUser.FirstName, login),
                LastName = NonEmptyOrDefault(directoryUser.LastName, string.Empty),
                Role = Role.Admin,
                CreatedAt = now,
                LastLoginAt = now
            };
        }

        /// <summary>Keeps the imported name when the directory has no value for it.</summary>
        private static void ApplyDirectoryNames(User user, LdapUser directoryUser)
        {
            user.FirstName = NonEmptyOrDefault(directoryUser.FirstName, user.FirstName);
            user.LastName = NonEmptyOrDefault(directoryUser.LastName, user.LastName);
        }

        /// <summary>Trimmed directory value cut to the column length, or the fallback when it is empty.</summary>
        private static string NonEmptyOrDefault(string? value, string fallback)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return fallback;
            }

            var trimmed = value.Trim();

            return trimmed.Length <= User.NameMaxLength
                ? trimmed
                : trimmed[..User.NameMaxLength];
        }

        private static LoginResponse ToResponse(User user, AccessToken accessToken)
        {
            return new LoginResponse(accessToken.Token, user.ToCurrentUserResponse());
        }
    }
}
